import { BadRequestException, Type } from '@nestjs/common';
import { Builder } from 'builder-pattern';
import { Model } from 'mongoose';
import { BaseEntity } from '../../models';

export abstract class BaseService<Entity extends BaseEntity> {
  protected readonly entity: Type<Entity>;

  protected constructor(protected readonly model: Model<Entity>) {}

  get isSoftDeletable() {
    return Object.getOwnPropertyNames(this.model.schema.paths).includes(
      'deletedAt',
    );
  }

  protected buildInstance(document: Entity) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id, __v, ...rest } = document;

    return Builder(this.entity, rest as Partial<Entity>)
      .id(_id?.toString() ?? id)
      .build();
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
  }

  protected handleDocumentNotFound() {
    throw new BadRequestException('Document not found');
  }
}
