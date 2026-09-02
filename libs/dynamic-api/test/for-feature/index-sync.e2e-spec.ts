import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  // Suggestion #13 — a declared index MongoDB itself rejects (not a duplicate-key case at all)
  // fails the exact same way: silently, unless enableDynamicAPIIndexSync is actually called.
  // $ne/$not are rejected by MongoDB's partialFilterExpression validator (only $eq, $exists,
  // $gt(e), $lt(e), $type, and a top-level $and are accepted).
  @DynamicAPISchemaOptions({
    indexes: [
      {
        fields: { email: 1 },
        options: { unique: true, partialFilterExpression: { email: { $ne: null } } },
      },
    ],
  })
  @Schema({ collection: 'index-sync-invalid-partial-filter-users' })
  class InvalidPartialFilterUserEntity extends BaseEntity {
    @Prop({ type: String })
    email?: string;
  }

  describe('when a declared index is rejected by MongoDB for a reason other than a duplicate key', () => {
    const bootInvalidPartialFilterApp = async (): Promise<INestApplication> => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          DynamicApiModule.forRoot(uri),
          DynamicApiModule.forFeature({
            entity: InvalidPartialFilterUserEntity,
            controllerOptions: { path: 'index-sync-invalid-partial-filter-users' },
          }),
        ],
      }).compile();

      return createTestingApp(moduleRef);
    };

    it('boots without any error and never actually creates the index when enableDynamicAPIIndexSync is not called — the silent failure suggestion #13 reports', async () => {
      const app = await bootInvalidPartialFilterApp();

      // Give Mongoose's own background auto-index build a moment to (fail to) run.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const model = await getModelFromEntity(InvalidPartialFilterUserEntity);
      const indexes = await model.collection.indexes();

      // The declared unique index was never actually built — nothing surfaced that.
      expect(indexes.some((index) => index.unique)).toBe(false);
    });

    it('rejects loudly with the real MongoDB error when enableDynamicAPIIndexSync is called', async () => {
      const app = await bootInvalidPartialFilterApp();

      await expect(enableDynamicAPIIndexSync(app)).rejects.toThrow(
        /partial index/i,
      );
    });
  });
});
