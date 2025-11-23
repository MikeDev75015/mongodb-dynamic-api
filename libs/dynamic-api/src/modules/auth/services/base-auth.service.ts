import { BadRequestException, ForbiddenException, Type, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { DynamicApiResetPasswordCallbackMethods, DynamicApiServiceBeforeSaveCallback, DynamicApiServiceCallback } from '../../../interfaces';
import { MongoDBDynamicApiLogger } from '../../../logger';
import { BaseEntity } from '../../../models';
import { BaseService, BcryptService } from '../../../services';
import { DynamicApiResetPasswordOptions } from '../interfaces';

export abstract class BaseAuthService<Entity extends BaseEntity> extends BaseService<Entity> {
  protected entity: Type<Entity>;
  protected loginField = 'email' as keyof Entity;
  protected passwordField = 'password' as keyof Entity;
  protected additionalRequestFields: (keyof Entity)[] = [];
  protected beforeRegisterCallback: DynamicApiServiceBeforeSaveCallback<Entity>;
  protected registerCallback: DynamicApiServiceCallback<Entity> | undefined;
  protected beforeUpdateAccountCallback: DynamicApiServiceBeforeSaveCallback<Entity>;
  protected updateAccountCallback: DynamicApiServiceCallback<Entity> | undefined;
  protected loginCallback: DynamicApiServiceCallback<Entity> | undefined;
  protected resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;

  private resetPasswordCallbackMethods: DynamicApiResetPasswordCallbackMethods<Entity> | undefined;

  private readonly logger = new MongoDBDynamicApiLogger('AuthService');

  protected constructor(
    protected readonly model: Model<Entity>,
    protected readonly jwtService: JwtService,
    protected readonly bcryptService: BcryptService,
  ) {
    super(model);
  }

  protected async validateUser(login: string, pass: string): Promise<Entity> {
    this.logger.debug('Validating user', { login, pass: !!pass });
    this.verifyArguments(login, pass);

    const user = (
      // @ts-ignore
      await this.model.findOne({ [this.loginField]: login }).lean().exec()
    ) as Entity;

    // @ts-ignore
    const isPasswordValid = user ? await this.bcryptService.comparePassword(pass, user[this.passwordField]) : false;

    if (!user || !isPasswordValid) {
      return null;
    }

    return { ...user, id: user._id.toString() } as Entity;
  }

  protected async login(user: Entity, fromMember = false) {
    this.logger.debug('Logging in user', { userId: user?.id, fromMember });
    this.verifyArguments(user);

    if (!fromMember && !!this.loginCallback) {
      const fullUser = (await this.model.findOne({ _id: user.id }).lean().exec()) as Entity;
      const instance = this.buildInstance(fullUser);
      await this.loginCallback(instance, this.callbackMethods);
    }

    const fieldsToBuild = [
      '_id' as keyof Entity,
      'id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];


    const payload: object = {
      ...this.buildUserFields(user, fieldsToBuild),
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
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
        const user = (await this.model.findOne({ _id: created._id }).lean().exec()) as Entity;
        const instance = this.buildInstance(user);
        await this.registerCallback(instance, this.callbackMethods);
      }

      const user = (await this.model.findOne({ _id: created._id }).lean().exec()) as Entity;

      return this.login(user, true);
    } catch (error) {
      this.handleDuplicateKeyError(error, false);
      this.handleMongoErrors(error);
    }
  }

  protected async getAccount({ id }: Entity): Promise<Entity> {
    this.logger.debug('Getting account', { userId: id });
    this.verifyArguments(id);

    const user = (await this.model.findOne({ _id: id }).lean().exec()) as Entity;

    const fieldsToBuild = [
      '_id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    return this.buildUserFields(user, fieldsToBuild);
  }

  protected async updateAccount({ id }: Entity, update: Partial<Entity>): Promise<Entity> {
    this.logger.debug('Updating account', { userId: id, update });
    this.verifyArguments(id, update);

    if (this.beforeUpdateAccountCallback) {
      const user = (
        await this.model.findOne({ _id: id }).lean().exec()
      ) as Entity;
      update =
        await this.beforeUpdateAccountCallback({ ...user, id: user._id.toString() }, { update }, this.callbackMethods);
    }

    await this.model.updateOne(
      { _id: id },
      // @ts-ignore
      { $set: update },
    ).exec();

    if (this.updateAccountCallback) {
      const fullUser = (await this.model.findOne({ _id: id }).lean().exec()) as Entity;
      const instance = this.buildInstance(fullUser);
      await this.updateAccountCallback(instance, this.callbackMethods);
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
        .lean()
        .exec();

        if (!user) {
          return;
        }

        return this.buildInstance(user as Entity);
      },
      updateUserByEmail: async (update: UpdateQuery<Entity> | UpdateWithAggregationPipeline) => {
        const user = await this.model.findOneAndUpdate(
          // @ts-ignore
          { [this.resetPasswordOptions.emailField]: email },
          update,
          { new: true },
        ).lean().exec();

        if (!user) {
          return;
        }

        return this.buildInstance(user as Entity);
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
    } catch (error) {
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
      const user = (
        await this.model.findOne({ _id: userId }).lean().exec()
      ) as Entity;
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
      const user = (await this.model.findOne({ _id: userId }).lean().exec()) as Entity;
      await this.resetPasswordOptions.changePasswordCallback(
        { ...user, id: user._id.toString() },
        this.callbackMethods,
      );
    }
  }

  private buildUserFields(user: Entity, fieldsToBuild: (keyof Entity)[]) {
    return this.buildInstance(fieldsToBuild.reduce<Entity>(
      (acc, field) => (
        user[field] !== undefined ? { ...acc, [field]: user[field] } : acc
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