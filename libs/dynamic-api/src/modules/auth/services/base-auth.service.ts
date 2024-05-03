import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { DynamicApiResetPasswordCallbackMethods, DynamicApiServiceCallback } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { BaseService, BcryptService } from '../../../services';
import { DynamicApiResetPasswordOptions } from '../interfaces';

export abstract class BaseAuthService<Entity extends BaseEntity> extends BaseService<Entity> {
  protected loginField = 'email' as keyof Entity;
  protected passwordField = 'password' as keyof Entity;
  protected additionalRequestFields: (keyof Entity)[] = [];
  protected registerCallback: DynamicApiServiceCallback<Entity> | undefined;
  protected loginCallback: DynamicApiServiceCallback<Entity> | undefined;

  protected resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;

  private resetPasswordCallbackMethods: DynamicApiResetPasswordCallbackMethods<Entity> | undefined;

  private readonly logger = new Logger('AuthService');

  protected constructor(
    protected readonly model: Model<Entity>,
    protected readonly jwtService: JwtService,
    protected readonly bcryptService: BcryptService,
  ) {
    super(model);
  }

  protected async validateUser(login: string, pass: string): Promise<Entity> {
    const user = (
      // @ts-ignore
      await this.model.findOne({ [this.loginField]: login }).lean().exec()
    ) as Entity;

    // @ts-ignore
    if (!user || !(await this.bcryptService.comparePassword(pass, user[this.passwordField]))) {
      return null;
    }

    const fieldsToBuild = [
      '_id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    return this.buildUserFields(user, fieldsToBuild);
  }

  protected async login(user: Entity, fromMember = false) {
    const fieldsToBuild = [
      '_id' as keyof Entity,
      'id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    const payload = this.buildUserFields(user, fieldsToBuild);

    if (!fromMember && this.loginCallback) {
      await this.loginCallback(payload, this.callbackMethods);
    }

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  protected async register(userToCreate: Partial<Entity>) {
    try {
      // @ts-ignore
      const hashedPassword = await this.bcryptService.hashPassword(userToCreate[this.passwordField]);
      const { _id } = await this.model.create({ ...userToCreate, [this.passwordField]: hashedPassword });
      const user = await this.findOneDocumentWithAbilityPredicate(_id);

      if (this.registerCallback) {
        await this.registerCallback(user, this.callbackMethods);
      }

      return this.login(user, true);
    } catch (error) {
      this.handleDuplicateKeyError(error);
    }
  }

  protected async getAccount({ id }: Entity): Promise<Entity> {
    const user = await this.findOneDocumentWithAbilityPredicate(id);

    const fieldsToBuild = [
      '_id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    return this.buildUserFields(user, fieldsToBuild);
  }

  protected async resetPassword(email: string) {
    if (!this.resetPasswordOptions) {
      return;
    }

    this.resetPasswordCallbackMethods = {
      findUserByEmail: async (email: string) => {
        // @ts-ignore
        const user = await this.model.findOne({ [this.resetPasswordOptions.emailField]: email })
        .lean()
        .exec();

        if (!user) {
          return;
        }

        return this.buildInstance(user as Entity);
      },
      updateUserByEmail: async (email: string, data: Partial<Entity>) => {
        const user = await this.model.findOneAndUpdate(
          // @ts-ignore
          { [this.resetPasswordOptions.emailField]: email },
          data,
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
      );
      userId = _id.toString();
    } catch (error) {
      this.logger.warn('Invalid email, user not found');
    }

    if (!userId) {
      return;
    }

    const hashedPassword = await this.bcryptService.hashPassword(newPassword);

    await this.model.updateOne(
      { _id: userId },
      // @ts-ignore
      { [this.passwordField]: hashedPassword },
    );

    if (this.resetPasswordOptions?.changePasswordCallback) {
      const user = await this.findOneDocumentWithAbilityPredicate(userId);
      await this.resetPasswordOptions.changePasswordCallback(this.buildInstance(user), this.callbackMethods);
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
}