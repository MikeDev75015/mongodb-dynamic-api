import { BadRequestException, ForbiddenException, Type, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt, randomUUID } from 'node:crypto';
import { FilterQuery, Model, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { DynamicApiResetPasswordCallbackMethods, BeforeSaveCallback, AfterSaveCallback } from '../../../interfaces';
import { MongoDBDynamicApiLogger } from '../../../logger/mongo-dynamic-api.logger';
import { BaseEntity } from '../../../models';
import { BaseService } from '../../../services/base/base.service';
import { BcryptService } from '../../../services/bcrypt/bcrypt.service';
import { DynamicApiModule } from '../../../dynamic-api.module';
import { OtpCode } from '../models/otp-code.model';
import { DynamicApiResetPasswordOptions, PasswordlessOptions } from '../interfaces';

/** Internal record stored in `refreshTokenField` (JSON-encoded). */
interface RefreshTokenRecord {
  /** bcrypt hash of the current valid jti. */
  currentHash: string;
  /** bcrypt hash of the previous jti — kept for grace-window reuse detection. */
  previousHash?: string;
  /** Epoch ms when the last rotation occurred — used to enforce `reuseWindowMs`. */
  rotatedAt?: number;
  /** Token pair cached at rotation time — returned on grace-window hits (idempotency). */
  cachedTokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export abstract class BaseAuthService<Entity extends BaseEntity> extends BaseService<Entity> {
  protected entity: Type<Entity>;
  protected loginField = 'email' as keyof Entity;
  protected passwordField = 'password' as keyof Entity;
  protected additionalRequestFields: (keyof Entity)[] = [];
  protected beforeRegisterCallback: BeforeSaveCallback<Entity>;
  protected registerCallback: AfterSaveCallback<Entity> | undefined;
  protected beforeUpdateAccountCallback: BeforeSaveCallback<Entity>;
  protected updateAccountCallback: AfterSaveCallback<Entity> | undefined;
  protected loginCallback: AfterSaveCallback<Entity> | undefined;
  protected getAccountCallback: AfterSaveCallback<Entity> | undefined;
  protected resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;
  protected refreshTokenField: keyof Entity | undefined;
  protected passwordlessOptions: PasswordlessOptions<Entity> | undefined;

  /** refreshTokenOnUpdate */
  protected refreshTokenOnUpdate = false;

  /**
   * When false, the stored hash is NOT rotated on each refresh call.
   * Enables persistent-token mode: same token valid until logout/revocation.
   * Default: true.
   */
  protected rotate = true;

  /**
   * Grace-window in milliseconds.
   * Within this window after a rotation, the superseded (previous) jti is still accepted
   * and returns the cached token pair, preventing false-positive 401s on concurrent bursts.
   * Default: 0 (disabled).
   */
  protected reuseWindowMs = 0;

  private resetPasswordCallbackMethods: DynamicApiResetPasswordCallbackMethods<Entity> | undefined;

  private readonly logger = new MongoDBDynamicApiLogger('AuthService');

  protected constructor(
    protected readonly model: Model<Entity>,
    protected readonly jwtService: JwtService,
    protected readonly bcryptService: BcryptService,
    protected readonly otpModel?: Model<OtpCode>,
  ) {
    super(model);
  }

  protected async validateUser(login: string, pass: string): Promise<Entity> {
    this.logger.debug('Validating user', { login, pass: !!pass });
    this.verifyArguments(login, pass);

    // @ts-ignore
    const user = await this.model.findOne({ [this.loginField]: login }).lean<Entity>().exec();

    // @ts-ignore
    const isPasswordValid = user ? await this.bcryptService.comparePassword(pass, user[this.passwordField]) : false;

    if (!user || !isPasswordValid) {
      return null;
    }

    return { ...user, id: user._id.toString() };
  }

  protected async login(user: Entity, fromMember = false) {
    this.logger.debug('Logging in user', { userId: user?.id, fromMember });
    this.verifyArguments(user);

    if (!fromMember && !!this.loginCallback) {
      const fullUser = await this.model.findOne({ _id: user.id }).lean<Entity>().exec();
      const instance = this.buildInstance(fullUser);
      await this.loginCallback(instance, this.callbackMethods);
    }

    const fieldsToBuild = [
      '_id' as keyof Entity,
      'id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    const payload: object = { ...this.buildUserFields(user, fieldsToBuild) };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.buildRefreshToken(payload);

    if (this.refreshTokenField && (user._id || user.id)) {
      const decodedRefresh = this.jwtService.decode(refreshToken);
      const jti: string = decodedRefresh && typeof decodedRefresh !== 'string' ? decodedRefresh['jti'] : '';
      const hashedRefreshToken = await this.bcryptService.hashPassword(jti);
      const record: RefreshTokenRecord = { currentHash: hashedRefreshToken };
      await this.model.updateOne(
        { _id: user._id || user.id },
        // @ts-ignore
        { $set: { [this.refreshTokenField]: JSON.stringify(record) } },
      ).exec();
    }

    return { accessToken, refreshToken };
  }

  protected async register(userToCreate: Partial<Entity>) {
    this.logger.debug('Registering user', { userToCreate });
    this.verifyArguments(userToCreate);
    this.checkFieldsValidity(userToCreate);

    try {
      // @ts-ignore
      const hashedPassword = await this.bcryptService.hashPassword(userToCreate[this.passwordField]);

      if (this.beforeRegisterCallback) {
        userToCreate =
          await this.beforeRegisterCallback(userToCreate as Entity, { hashedPassword }, this.callbackMethods);
      }

      const created = await this.model.create({ ...userToCreate, [this.passwordField]: hashedPassword });

      if (this.registerCallback) {
        const user = await this.model.findOne({ _id: created._id }).lean<Entity>().exec();
        const instance = this.buildInstance(user);
        await this.registerCallback(instance, this.callbackMethods);
      }

      const user = await this.model.findOne({ _id: created._id }).lean<Entity>().exec();

      return this.login(user, true);
    } catch (error) {
      this.handleDuplicateKeyError(error, false);
      this.handleMongoErrors(error);
    }
  }

  protected async getAccount({ id }: Entity): Promise<Entity> {
    this.logger.debug('Getting account', { userId: id });
    this.verifyArguments(id);

    const user = (await this.model.findOne({ _id: id }).lean<Entity>().exec());

    if (this.getAccountCallback) {
      const instance = this.buildInstance(user);
      await this.getAccountCallback(instance, this.callbackMethods);
    }

    const fieldsToBuild = [
      '_id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    return this.buildUserFields(user, fieldsToBuild);
  }

  protected async updateAccount({ id }: Entity, update: Partial<Entity>): Promise<Entity | import('../interfaces').LoginResponse> {
    this.logger.debug('Updating account', { userId: id, update });
    this.verifyArguments(id, update);

    if (this.beforeUpdateAccountCallback) {
      const user = await this.model.findOne({ _id: id }).lean<Entity>().exec();
      update =
        await this.beforeUpdateAccountCallback({ ...user, id: user._id.toString() }, { update }, this.callbackMethods);
    }

    // Goes through BaseService.updateOneDocument (not a raw this.model.updateOne) specifically
    // so any @DerivedField({ on: 'save' }) declared on Entity gets auto-recomputed after this
    // write, same as every other out-of-native-pipeline write CallbackMethods exposes
    // (updateOneDocument/rawUpdateOneDocument) — updateAccount used to bypass that entirely,
    // leaving derived fields stale after a profile update.
    await this.updateOneDocument(
      this.entity,
      { _id: id } as FilterQuery<Entity>,
      // @ts-ignore
      { $set: update },
    );

    if (this.updateAccountCallback) {
      const fullUser = (await this.model.findOne({ _id: id }).lean<Entity>().exec());
      const instance = this.buildInstance(fullUser);
      await this.updateAccountCallback(instance, this.callbackMethods);
    }

    if (this.refreshTokenOnUpdate) {
      const updatedUser = await this.model.findOne({ _id: id }).lean<Entity>().exec();
      return this.login({ ...updatedUser, id: updatedUser._id.toString() }, true);
    }

    return this.getAccount({ id } as Entity);
  }

  protected async resetPassword(email: string) {
    this.logger.debug('Resetting password', { email });
    this.verifyArguments(email);

    if (!this.resetPasswordOptions) {
      return;
    }

    this.resetPasswordCallbackMethods = {
      findUserByEmail: async () => {
        // @ts-ignore
        const user = await this.model.findOne({ [this.resetPasswordOptions.emailField]: email })
        .lean<Entity>()
        .exec();

        if (!user) {
          return;
        }

        return this.buildInstance(user);
      },
      updateUserByEmail: async (update: UpdateQuery<Entity> | UpdateWithAggregationPipeline) => {
        const user = await this.model.findOneAndUpdate(
          // @ts-ignore
          { [this.resetPasswordOptions.emailField]: email },
          update,
          { new: true },
        ).lean<Entity>().exec();

        if (!user) {
          return;
        }

        return this.buildInstance(user);
      },
    };

    const { resetPasswordCallback, expirationInMinutes } = this.resetPasswordOptions;

    const resetPasswordToken = this.jwtService.sign(
      { email },
      { expiresIn: expirationInMinutes * 60 },
    );

    await resetPasswordCallback({ resetPasswordToken, email }, this.resetPasswordCallbackMethods);
  }

  protected async changePassword(resetPasswordToken: string, newPassword: string) {
    this.logger.debug('Changing password', { resetPasswordToken: !!resetPasswordToken, newPassword: !!newPassword });
    this.verifyArguments(resetPasswordToken, newPassword);

    let email: string;
    let exp: number;

    try {
      const decoded = this.jwtService.decode(resetPasswordToken);
      email = decoded.email;
      exp = decoded.exp;
    } catch {
      this.logger.warn('Invalid reset password token');
    }

    if (!email || !exp) {
      throw new BadRequestException('Invalid reset password token. Please redo the reset password process.');
    }

    const now = Math.round(Date.now() / 1000);
    if (exp <= now) {
      throw new UnauthorizedException('Time to reset password has expired. Please redo the reset password process.');
    }

    let userId: string;
    try {
      const { _id } = await this.findOneDocumentWithAbilityPredicate(
        undefined,
        // @ts-ignore
        { [this.resetPasswordOptions.emailField]: email },
        this.resetPasswordOptions?.changePasswordAbilityPredicate,
      );
      userId = _id.toString();
    } catch (error) {
      if (error.status === 403) {
        throw new ForbiddenException('You are not allowed to change your password.');
      }
      this.logger.warn('Invalid email, user not found');
    }

    if (!userId) {
      return;
    }

    const hashedPassword = await this.bcryptService.hashPassword(newPassword);

    if (this.resetPasswordOptions?.beforeChangePasswordCallback) {
      const user = await this.model.findOne({ _id: userId }).lean<Entity>().exec();
      await this.resetPasswordOptions.beforeChangePasswordCallback(
        { ...user, id: user._id.toString() },
        { resetPasswordToken, newPassword, hashedPassword },
        this.callbackMethods,
      );
    }

    await this.model.updateOne(
      { _id: userId },
      // @ts-ignore
      { $set: { [this.passwordField]: hashedPassword, resetPasswordToken: null } },
    );

    if (this.resetPasswordOptions?.changePasswordCallback) {
      const user = await this.model.findOne({ _id: userId }).lean<Entity>().exec();
      await this.resetPasswordOptions.changePasswordCallback(
        { ...user, id: user._id.toString() },
        this.callbackMethods,
      );
    }
  }

  protected async refreshToken(user: Entity, rawToken?: string) {
    this.logger.debug('Refreshing token', { userId: user?.id });
    this.verifyArguments(user);

    if (!this.refreshTokenField) {
      return this.buildTokenPair(user);
    }

    const userId = user._id || user.id;
    const storedUser = await this.model.findOne({ _id: userId }).lean<Entity>().exec();
    const storedRaw = storedUser?.[this.refreshTokenField] as string | undefined;
    const incomingJti = this.extractIncomingJti(rawToken);

    if (!storedRaw || !incomingJti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const record = this.parseRefreshTokenRecord(storedRaw);
    const isCurrentValid = await this.bcryptService.comparePassword(incomingJti, record.currentHash);

    if (!isCurrentValid) {
      return this.handleInvalidCurrentJti(incomingJti, record, userId);
    }

    if (this.rotate === false) {
      // Persistent-token mode: validate only, no rotation.
      return this.buildTokenPair(user);
    }

    return this.rotateCasOrThrow(userId, storedRaw, incomingJti, user, record);
  }

  /**
   * Extracts the `jti` claim from a raw JWT string.
   * Returns `undefined` when `rawToken` is absent, not decodable, or carries no `jti`.
   */
  private extractIncomingJti(rawToken?: string): string | undefined {
    if (!rawToken) {
      return undefined;
    }
    const decoded = this.jwtService.decode(rawToken);
    if (!decoded || typeof decoded === 'string') {
      return undefined;
    }
    return decoded['jti'] as string | undefined;
  }

  /**
   * Called when the incoming jti does NOT match `record.currentHash`.
   * Checks the grace window against `record.previousHash`; returns the cached pair
   * if still valid, otherwise throws `UnauthorizedException`.
   */
  private async handleInvalidCurrentJti(
    incomingJti: string,
    record: RefreshTokenRecord,
    userId: Entity['_id'] | string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const cached = await this.checkGraceWindow(incomingJti, record);
    if (cached) {
      this.logger.debug('Refresh token reused within grace window — returning cached pair', { userId });
      return cached;
    }
    throw new UnauthorizedException('Invalid refresh token');
  }

  /**
   * Builds a new token pair and attempts an atomic compare-and-swap (CAS) rotation.
   * On a CAS miss (concurrent rotation), delegates to `handleCasMiss`.
   */
  private async rotateCasOrThrow(
    userId: Entity['_id'] | string,
    storedRaw: string,
    incomingJti: string,
    user: Entity,
    record: RefreshTokenRecord,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Build new token pair and attempt atomic CAS rotation.
    const newPair = await this.buildTokenPair(user);
    const newRecord = await this.buildRotatedRecord(record, newPair);
    const newRecordJson = JSON.stringify(newRecord);

    // findOneAndUpdate acts as compare-and-swap: only updates if the stored value
    // still matches what we just read (prevents duplicate rotations under concurrency).
    const casResult = await this.model.findOneAndUpdate(
      // @ts-ignore — dynamic field key
      { _id: userId, [this.refreshTokenField]: storedRaw } as FilterQuery<Entity>,
      // @ts-ignore — dynamic field key
      { $set: { [this.refreshTokenField]: newRecordJson } },
      { new: false },
    ).lean<Entity>().exec();

    if (!casResult) {
      return this.handleCasMiss(userId, incomingJti);
    }

    return newPair;
  }

  /**
   * Called when the CAS rotation missed (concurrent winner already rotated).
   * Re-reads the stored record and checks whether the winner's grace window covers
   * the incoming jti; returns the cached pair if so, otherwise throws.
   */
  private async handleCasMiss(
    userId: Entity['_id'] | string,
    incomingJti: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // CAS missed — a concurrent rotation already happened.
    // Re-read and check if the grace window of the winner covers this request.
    this.logger.debug('CAS miss on refresh rotation — checking grace window of winning rotation', { userId });
    const rereadUser = await this.model.findOne({ _id: userId }).lean<Entity>().exec();
    const rereadRaw = rereadUser?.[this.refreshTokenField] as string | undefined;

    if (rereadRaw) {
      const rereadRecord = this.parseRefreshTokenRecord(rereadRaw);
      const cached = await this.checkGraceWindow(incomingJti, rereadRecord);
      if (cached) {
        this.logger.debug('CAS miss covered by grace window — returning cached pair', { userId });
        return cached;
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }


  protected async logout(user: Entity) {
    this.logger.debug('Logging out user', { userId: user.id });
    this.verifyArguments(user);

    if (!this.refreshTokenField) {
      this.logger.warn(
        'logout called without refreshTokenField configured. ' +
        'Server-side token revocation is not possible. ' +
        'To enable server-side revocation, add a field to your entity ' +
        'and configure refreshToken.refreshTokenField in your auth options.',
      );
      return;
    }

    await this.model.updateOne(
      { _id: user._id || user.id },
      // @ts-ignore
      { $set: { [this.refreshTokenField]: null } },
    ).exec();
  }

  async sendOtpCode(identifier: string): Promise<void> {
    this.logger.debug('Sending OTP code', { identifier });
    this.verifyArguments(identifier);

    if (!this.passwordlessOptions) {
      return;
    }

    const { otpExpirationMinutes = 10, generateCode, sendCodeCallback } = this.passwordlessOptions;

    const code = generateCode ? generateCode() : String(randomInt(100000, 1000000));
    const hashedCode = await this.bcryptService.hashPassword(code);
    const expiresAt = new Date(Date.now() + otpExpirationMinutes * 60 * 1000);

    await this.otpModel.findOneAndUpdate(
      { identifier },
      { identifier, hashedCode, expiresAt },
      { upsert: true, new: true },
    ).exec();

    await sendCodeCallback(identifier, code);
  }

  async verifyOtpCode(identifier: string, code: string): Promise<import('../interfaces').LoginResponse> {
    this.logger.debug('Verifying OTP code', { identifier });
    this.verifyArguments(identifier, code);

    const otpDoc = await this.otpModel.findOne({ identifier }).exec();

    if (!otpDoc || otpDoc.expiresAt <= new Date()) {
      throw new UnauthorizedException('OTP code has expired or does not exist. Please request a new one.');
    }

    const isCodeValid = await this.bcryptService.comparePassword(code, otpDoc.hashedCode);
    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid OTP code.');
    }

    // @ts-ignore
    const user = await this.model.findOne({ [this.loginField]: identifier }).lean<Entity>().exec();

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    await this.otpModel.deleteOne({ identifier }).exec();

    const userWithId = { ...user, id: user._id.toString() };

    if (this.passwordlessOptions?.callback) {
      const instance = this.buildInstance(user);
      await this.passwordlessOptions.callback(instance, this.callbackMethods);
    }

    return this.login(userWithId, true);
  }

  private buildRefreshToken(payload: object): string {
    const refreshSecret = DynamicApiModule.state.get<string | undefined>('jwtRefreshSecret');
    const refreshTokenExpiresIn = DynamicApiModule.state.get<string | number | undefined>('jwtRefreshTokenExpiresIn');

    // @ts-ignore
    return this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        ...(refreshSecret ? { secret: refreshSecret } : {}),
        // @ts-ignore
        ...(refreshTokenExpiresIn ? { expiresIn: refreshTokenExpiresIn } : {}),
      },
    );
  }

  /**
   * Builds an `{ accessToken, refreshToken }` pair from the user's payload fields.
   * Pure: does NOT update the database.
   */
  private async buildTokenPair(user: Entity): Promise<{ accessToken: string; refreshToken: string }> {
    const fieldsToBuild = [
      '_id' as keyof Entity,
      'id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];
    const payload: object = { ...this.buildUserFields(user, fieldsToBuild) };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.buildRefreshToken(payload);
    return { accessToken, refreshToken };
  }

  /**
   * Parses the value stored in `refreshTokenField`.
   * Supports both the legacy plain-bcrypt-hash format and the new JSON `RefreshTokenRecord` format.
   */
  private parseRefreshTokenRecord(storedRaw: string): RefreshTokenRecord {
    try {
      const parsed: unknown = JSON.parse(storedRaw);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'currentHash' in parsed &&
        typeof (parsed as RefreshTokenRecord).currentHash === 'string'
      ) {
        return parsed as RefreshTokenRecord;
      }
    } catch {
      // Not JSON — fall through to legacy plain-hash treatment.
    }
    // Legacy format: the entire stored string is the bcrypt hash of the jti.
    return { currentHash: storedRaw };
  }

  /**
   * Checks whether `incomingJti` matches the `previousHash` of `record` and the rotation
   * occurred within the configured `reuseWindowMs` grace window.
   * Returns the cached token pair if the window is active, `null` otherwise.
   */
  private async checkGraceWindow(
    incomingJti: string,
    record: RefreshTokenRecord,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (this.reuseWindowMs <= 0 || !record.previousHash || !record.rotatedAt) {
      return null;
    }
    if (Date.now() - record.rotatedAt > this.reuseWindowMs) {
      return null;
    }
    const isPreviousValid = await this.bcryptService.comparePassword(incomingJti, record.previousHash);
    if (!isPreviousValid) {
      return null;
    }
    return record.cachedTokens ?? null;
  }

  /**
   * Builds the `RefreshTokenRecord` that will replace the current stored record after rotation.
   * When `reuseWindowMs > 0`, the current hash is preserved as `previousHash` together with
   * the cached new token pair so that grace-window hits can return an idempotent response.
   */
  private async buildRotatedRecord(
    currentRecord: RefreshTokenRecord,
    newPair: { accessToken: string; refreshToken: string },
  ): Promise<RefreshTokenRecord> {
    const decodedNew = this.jwtService.decode(newPair.refreshToken);
    const newJti: string =
      decodedNew && typeof decodedNew !== 'string' ? (decodedNew['jti'] as string) : '';
    const newHash = await this.bcryptService.hashPassword(newJti);

    const newRecord: RefreshTokenRecord = { currentHash: newHash };

    if (this.reuseWindowMs > 0) {
      newRecord.previousHash = currentRecord.currentHash;
      newRecord.rotatedAt = Date.now();
      newRecord.cachedTokens = newPair;
    }

    return newRecord;
  }

  private buildUserFields(user: Entity, fieldsToBuild: (keyof Entity)[]) {
    return this.buildInstance(fieldsToBuild.reduce<Entity>(
      (acc, field) => (
        user[field] === undefined ? acc : { ...acc, [field]: user[field] }
      ),
      {} as Entity,
    ));
  }

  private checkFieldsValidity(userToCreate: Partial<Entity>): void {
    const errors: string[] = [];

    if (!userToCreate[this.loginField]) {
      errors.push(`${String(this.loginField)} property is required`);
    }

    if (!userToCreate[this.passwordField]) {
      errors.push(`${String(this.passwordField)} property is required`);
    }

    if (!errors.length) {
      return;
    }

    throw new BadRequestException(errors);
  }
}