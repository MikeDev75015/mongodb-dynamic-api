import { Type } from '@nestjs/common';
import { createConnection, Model } from 'mongoose';
import { buildSchemaFromEntity } from '../src';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getModelFromEntity = async <Entity>(entity: Type<Entity>) => {
  const connection = await createConnection(process.env.MONGO_DB_URL).asPromise();
  return connection.model(entity.name, buildSchemaFromEntity(entity)) as Model<Entity>;
}
