import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { DynamicApiServiceCallback } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { BaseService, BcryptService } from '../../../services';

export abstract class BaseAuthService<Entity extends BaseEntity> extends BaseService<Entity> {
  protected loginField = 'email' as keyof Entity;
  protected passwordField = 'password' as keyof Entity;
  protected additionalRequestFields: (keyof Entity)[] = [];
  protected registerCallback: DynamicApiServiceCallback<Entity> | undefined;
  protected loginCallback: DynamicApiServiceCallback<Entity> | undefined;

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
      await this.loginCallback(payload, this.model);
    }

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  protected async register(userToCreate: Partial<Entity>) {
    // @ts-ignore
    const hashedPassword = await this.bcryptService.hashPassword(userToCreate[this.passwordField]);
    try {
      const { _id } = await this.model.create({ ...userToCreate, [this.passwordField]: hashedPassword });
      const user = await this.findOneDocument(_id);

      if (this.registerCallback) {
        await this.registerCallback(user, this.model);
      }

      return this.login(user, true);
    } catch (error) {
      this.handleDuplicateKeyError(error);
    }
  }

  protected async getAccount({ id }: Entity): Promise<Entity> {
    const user = await this.findOneDocument(id);

    const fieldsToBuild = [
      '_id' as keyof Entity,
      this.loginField,
      ...this.additionalRequestFields,
    ];

    return this.buildUserFields(user, fieldsToBuild);
  }

  protected async changePassword(userId: string, newPassword: string) {
    // @ts-ignore
    const hashedPassword = await this.bcryptService.hashPassword(newPassword);
    // @ts-ignore
    const { _id } = await this.model.findOneAndUpdate(
      { _id: userId },
      // @ts-ignore
      { [this.passwordField]: hashedPassword },
      { new: true },
    );

    const user = await this.findOneDocument(_id);

    return this.login(user, true);
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