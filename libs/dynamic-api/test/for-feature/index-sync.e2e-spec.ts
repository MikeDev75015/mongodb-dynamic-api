import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose, { Schema as MongooseSchema } from 'mongoose';
import {
  BaseEntity,
  DynamicApiModule,
  DynamicAPISchemaOptions,
  enableDynamicAPIIndexSync,
} from '../../src';
import { closeTestingApp, createTestingApp } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';

describe('enableDynamicAPIIndexSync (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // autoIndex is disabled so the unique index only ever gets built by the explicit
  // enableDynamicAPIIndexSync call below — never implicitly on connect.
  @DynamicAPISchemaOptions({
    customInit: (schema: MongooseSchema) => {
      schema.set('autoIndex', false);
    },
  })
  @Schema({ collection: 'index-sync-users' })
  class IndexSyncUserEntity extends BaseEntity {
    @Prop({ type: String })
    name: string;

    @Prop({ type: String, unique: true })
    email?: string;
  }

  const bootApp = async (fixtures?: () => Promise<void>): Promise<INestApplication> => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(uri),
        DynamicApiModule.forFeature({
          entity: IndexSyncUserEntity,
          controllerOptions: { path: 'index-sync-users' },
        }),
      ],
    }).compile();

    return createTestingApp(moduleRef, fixtures ? async () => fixtures() : undefined);
  };

  describe('when legacy documents already violate a newly added unique index', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await bootApp(async () => {
        const model = await getModelFromEntity(IndexSyncUserEntity);
        // Legacy documents that predate the `email` field — both end up with the same
        // (missing/null) value once the unique index is built.
        await model.insertMany([{ name: 'legacy-1' }, { name: 'legacy-2' }]);
      });
    });

    it('rejects with an actionable message suggesting a partialFilterExpression fix', async () => {
      await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(
        /partialFilterExpression: \{ email: \{ \$exists: true \} \}/,
      );
    });

    it('names the offending collection and field in the error message', async () => {
      await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(
        /"index-sync-users" \(field "email"\)/,
      );
    });

    it('logs the error and resolves without throwing when throwOnError is false', async () => {
      await expect(enableDynamicAPIIndexSync(app, { throwOnError: false })).resolves.toBeUndefined();
    });
  });

  describe('when no documents violate the unique index', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await bootApp();
    });

    it('syncs successfully and actually builds the unique index', async () => {
      await expect(enableDynamicAPIIndexSync(app)).resolves.toBeUndefined();

      const model = await getModelFromEntity(IndexSyncUserEntity);
      const indexes = await model.collection.indexes();

      expect(indexes.some((index) => index.unique && index.key.email === 1)).toBe(true);
    });
  });
});
