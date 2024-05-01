import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  Type,
} from '@nestjs/common';
import { Builder } from 'builder-pattern';
import { FilterQuery, Model, Schema } from 'mongoose';
import { AbilityPredicate, DynamicApiCallbackMethods } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiResetPasswordOptions } from '../../modules';

export abstract class BaseService<Entity extends BaseEntity> {
  public abilityPredicate: AbilityPredicate<Entity> | undefined;
  public user: unknown;
  protected readonly entity: Type<Entity>;

  protected readonly passwordField: keyof Entity | undefined;

  protected readonly resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;

  protected readonly callbackMethods: DynamicApiCallbackMethods<Entity>;

  protected constructor(protected readonly model: Model<Entity>) {
    this.callbackMethods = {
      findById: async (id: string) => {
        const entity = await this.model.findOne({ _id: id }).lean().exec();
        if (!entity) {
          return;
        }

        return this.buildInstance(entity as Entity);
      },
      findAndUpdateById: async (id: string, update: Partial<Entity>) => {
        if (this.passwordField && typeof update[this.passwordField] !== 'undefined') {
          throw new BadRequestException(
            `${this.passwordField as string} cannot be updated using this method because it is hashed. Use reset password process instead.`,
          );
        }

        const updated = await this.model.findOneAndUpdate({ _id: id }, update, { new: true }).lean().exec();
        if (!updated) {
          this.handleDocumentNotFound();
        }

        return this.buildInstance(updated as Entity);
      },
    };
  }

  get isSoftDeletable() {
    const paths = Object.getOwnPropertyNames(this.model.schema.paths);
    return paths.includes('deletedAt') && paths.includes('isDeleted');
  }

  public async findManyDocuments(conditions: FilterQuery<Entity> = {}) {
    const documents = await this.model
    .find(conditions)
    .lean()
    .exec();

    if (this.abilityPredicate) {
      documents.forEach((d) => this.handleAbilityPredicate(d as Entity));
    }

    return documents as Entity[];
  }

  public async findOneDocument(_id: string | Schema.Types.ObjectId | undefined, conditions: FilterQuery<Entity> = {}) {
    const document = await this.model
    .findOne({
      ...(
        _id ? { _id } : {}
      ),
      ...conditions,
    })
    .lean()
    .exec();

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    if (this.abilityPredicate) {
      this.handleAbilityPredicate(document as Entity);
    }

    return document as Entity;
  }

  protected buildInstance(document: Entity) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id, __v, ...rest } = document;

    return Builder(this.entity, rest as Partial<Entity>)
      .id(_id?.toString() ?? id)
      .build();
  }

  protected handleAbilityPredicate(document: Entity) {
    const isAllowed = this.abilityPredicate(document, this.user);
    if (!isAllowed) {
      throw new ForbiddenException('Forbidden resource');
    }
  }

  protected handleDuplicateKeyError(error: any) {
    if (error.code === 11000) {
      const properties = Object.entries(error.keyValue)
        .filter(([key]) => key !== 'deletedAt')
        .map(([key, value]) => `${key} '${value}'`);

      throw new BadRequestException(
        properties.length === 1
          ? `${properties[0]} is already used`
          : `The combination of ${properties.join(', ')} already exists`,
      );
    }

    throw new ServiceUnavailableException(error.message);
  }

  protected handleDocumentNotFound() {
    throw new NotFoundException('Document not found');
  }
}
