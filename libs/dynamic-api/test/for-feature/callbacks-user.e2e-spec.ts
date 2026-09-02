import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { PipelineStage } from 'mongodb-pipeline-builder';
import {
  BaseEntity,
  DynamicApiModule,
  AfterSaveCallback,
  BeforeSaveCallback,
  BeforeSaveListCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveUpdateContext,
  BeforeSaveUpdateManyContext,
  BeforeSaveReplaceContext,
  BeforeSaveDuplicateContext,
  BeforeSaveDuplicateManyContext,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  DynamicAPIRouteConfig,
} from '../../src';
import { closeTestingApp, createTestingApp, server, TestSocketAdapter } from '../e2e.setup';
import 'dotenv/config';

/**
 * Integration tests: verify that the authenticated user is correctly
 * forwarded to every route callback / beforeSaveCallback and that
 * their return values are actually applied (no spies – real DB checks).
 *
 * Strategy:
 * - beforeSaveCallback uses user.email to stamp createdBy / updatedBy on the entity
 *   → verified by reading the response body after each mutation
 * - afterSave callback uses callbackMethods.createOneDocument to write an AuditLog
 *   with the user.email as performedBy
 *   → verified by querying the audit-logs endpoint
 */

// ── Shared Builders ──────────────────────────────────────────────

function buildEntities(collectionSuffix: string) {
  @Schema({ collection: `users-${collectionSuffix}` })
  class UserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;
  }

  @Schema({ collection: `items-${collectionSuffix}` })
  class ItemEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String })
    createdBy: string;

    @Prop({ type: String })
    updatedBy: string;
  }

  @Schema({ collection: `audit-logs-${collectionSuffix}` })
  class AuditLogEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    action: string;

    @Prop({ type: String, required: true })
    entityId: string;

    @Prop({ type: String })
    performedBy: string;
  }

  return { UserEntity, ItemEntity, AuditLogEntity };
}

class ItemAggregateQuery {
  name?: string;

  static toPipeline(query: ItemAggregateQuery): PipelineStage[] {
    return [{ $match: query.name ? { name: query.name } : {} }];
  }
}

function buildCallbacks(
  AuditLogEntity: any,
  actionPrefix: string,
) {
  const email = (user: unknown) => (user as any)?.email ?? 'anonymous';

  const createOneBeforeSave: BeforeSaveCallback<any, BeforeSaveCreateContext<any>> =
    async (_entity, context, _methods, user) => {
      return { ...context.toCreate, createdBy: email(user) };
    };

  const createOneAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}CreateOne`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const createManyBeforeSave: BeforeSaveListCallback<any, BeforeSaveCreateManyContext<any>> =
    async (_entities, context, _methods, user) => {
      return context.toCreate.map((item: any) => ({ ...item, createdBy: email(user) }));
    };

  const createManyAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}CreateMany`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const updateOneBeforeSave: BeforeSaveCallback<any, BeforeSaveUpdateContext<any>> =
    async (_entity, context, _methods, user) => {
      return { ...context.update, updatedBy: email(user) };
    };

  const updateOneAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}UpdateOne`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const updateManyBeforeSave: BeforeSaveListCallback<any, BeforeSaveUpdateManyContext<any>> =
    async (entities, context, _methods, user) => {
      return entities.map(() => ({ ...context.update, updatedBy: email(user) }));
    };

  const updateManyAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}UpdateMany`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const replaceOneBeforeSave: BeforeSaveCallback<any, BeforeSaveReplaceContext<any>> =
    async (_entity, context, _methods, user) => {
      return { ...context.replacement, updatedBy: email(user) };
    };

  const replaceOneAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}ReplaceOne`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const duplicateOneBeforeSave: BeforeSaveCallback<any, BeforeSaveDuplicateContext<any>> =
    async (_entity, context, _methods, user) => {
      return { ...(context.override ?? {}), createdBy: email(user) };
    };

  const duplicateOneAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}DuplicateOne`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const duplicateManyBeforeSave: BeforeSaveListCallback<any, BeforeSaveDuplicateManyContext<any>> =
    async (entities, context, _methods, user) => {
      return entities.map((e: any) => ({
        name: e.name,
        ...(context.override ?? {}),
        createdBy: email(user),
      }));
    };

  const duplicateManyAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}DuplicateMany`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const deleteOneBeforeSave: BeforeSaveDeleteCallback<any, BeforeSaveDeleteContext> =
    async (entity, _context, methods, user) => {
      if (entity) {
        await methods.createOneDocument(AuditLogEntity, {
          action: `${actionPrefix}DeleteOne-before`,
          entityId: entity.id,
          performedBy: email(user),
        });
      }
    };

  const deleteOneAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}DeleteOne`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const deleteManyBeforeSave: BeforeSaveDeleteManyCallback<any, BeforeSaveDeleteManyContext> =
    async (entities, _context, methods, user) => {
      await Promise.all(
        entities.map((entity: any) =>
          methods.createOneDocument(AuditLogEntity, {
            action: `${actionPrefix}DeleteMany-before`,
            entityId: entity._id?.toString() ?? entity.id,
            performedBy: email(user),
          }),
        ),
      );
    };

  const deleteManyAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}DeleteMany`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const getOneAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}GetOne`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const getManyAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}GetMany`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  const aggregateAfterSave: AfterSaveCallback<any> =
    async (entity, methods, user?) => {
      await methods.createOneDocument(AuditLogEntity, {
        action: `${actionPrefix}Aggregate`,
        entityId: entity.id,
        performedBy: email(user),
      });
    };

  return {
    createOneBeforeSave, createOneAfterSave,
    createManyBeforeSave, createManyAfterSave,
    updateOneBeforeSave, updateOneAfterSave,
    updateManyBeforeSave, updateManyAfterSave,
    replaceOneBeforeSave, replaceOneAfterSave,
    duplicateOneBeforeSave, duplicateOneAfterSave,
    duplicateManyBeforeSave, duplicateManyAfterSave,
    deleteOneBeforeSave, deleteOneAfterSave,
    deleteManyBeforeSave, deleteManyAfterSave,
    getOneAfterSave, getManyAfterSave,
    aggregateAfterSave,
  };
}

type Callbacks = ReturnType<typeof buildCallbacks>;

function buildRoutes(
  cb: Callbacks,
  opts?: { webSocket?: boolean },
): DynamicAPIRouteConfig<any>[] {
  const ws = opts?.webSocket ? { webSocket: true as const } : {};
  return [
    { type: 'CreateOne', ...ws, callback: cb.createOneAfterSave, beforeSaveCallback: cb.createOneBeforeSave },
    { type: 'CreateMany', ...ws, callback: cb.createManyAfterSave, beforeSaveCallback: cb.createManyBeforeSave },
    { type: 'UpdateOne', ...ws, callback: cb.updateOneAfterSave, beforeSaveCallback: cb.updateOneBeforeSave },
    { type: 'UpdateMany', ...ws, callback: cb.updateManyAfterSave, beforeSaveCallback: cb.updateManyBeforeSave },
    { type: 'ReplaceOne', ...ws, callback: cb.replaceOneAfterSave, beforeSaveCallback: cb.replaceOneBeforeSave },
    { type: 'DuplicateOne', ...ws, callback: cb.duplicateOneAfterSave, beforeSaveCallback: cb.duplicateOneBeforeSave },
    { type: 'DuplicateMany', ...ws, callback: cb.duplicateManyAfterSave, beforeSaveCallback: cb.duplicateManyBeforeSave },
    { type: 'DeleteOne', ...ws, callback: cb.deleteOneAfterSave, beforeSaveCallback: cb.deleteOneBeforeSave },
    { type: 'DeleteMany', ...ws, callback: cb.deleteManyAfterSave, beforeSaveCallback: cb.deleteManyBeforeSave },
    { type: 'GetOne', ...ws, callback: cb.getOneAfterSave },
    { type: 'GetMany', ...ws, callback: cb.getManyAfterSave },
    { type: 'Aggregate', ...ws, subPath: 'aggregate', dTOs: { query: ItemAggregateQuery }, callback: cb.aggregateAfterSave },
  ];
}

// ── HTTP Tests ───────────────────────────────────────────────────

describe('Callbacks receive authenticated user (e2e)', () => {
  const { UserEntity, ItemEntity, AuditLogEntity } = buildEntities('cb');
  const callbacks = buildCallbacks(AuditLogEntity, '');
  const routes = buildRoutes(callbacks);

  // ── Setup / teardown ──────────────────────────────────────────────

  let accessToken: string;
  const userEmail = 'cb-test@test.co';
  const userPassword = 'test';

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    const uri = process.env.MONGO_DB_URL;

    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(uri, { useAuth: { userEntity: UserEntity } }),
        DynamicApiModule.forFeature({
          entity: ItemEntity,
          controllerOptions: { path: 'items' },
          routes,
        }),
        DynamicApiModule.forFeature({
          entity: AuditLogEntity,
          controllerOptions: { path: 'audit-logs' },
        }),
      ],
    }).compile();

    await createTestingApp(moduleRef);

    // Register & login to get a JWT
    await server.post('/auth/register', { email: userEmail, password: userPassword });
    const { body } = await server.post(
      '/auth/login',
      { email: userEmail, password: userPassword },
    ) as any;
    accessToken = body.accessToken;
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ── Helpers ───────────────────────────────────────────────────────

  const auth = () => ({ authToken: accessToken });

  const getAuditLogs = async (action: string): Promise<any[]> => {
    const { body } = await server.get('/audit-logs', auth()) as any;
    return (body as any[]).filter((log: any) => log.action === action);
  };

  // ── Tests ─────────────────────────────────────────────────────────

  describe('CreateOne', () => {
    it('beforeSaveCallback should set createdBy from user and afterSave should create audit log', async () => {
      const { body, status } = await server.post('/items', { name: 'item-1' }, auth()) as any;

      expect(status).toBe(201);
      expect(body.createdBy).toBe(userEmail);

      const logs = await getAuditLogs('CreateOne');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        action: 'CreateOne',
        entityId: body.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('CreateMany', () => {
    it('beforeSaveCallback should set createdBy from user and afterSave should create audit logs', async () => {
      const { body, status } = await server.post(
        '/items/many',
        { list: [{ name: 'item-a' }, { name: 'item-b' }] },
        auth(),
      ) as any;

      expect(status).toBe(201);
      expect(body).toHaveLength(2);
      expect(body[0].createdBy).toBe(userEmail);
      expect(body[1].createdBy).toBe(userEmail);

      const logs = await getAuditLogs('CreateMany');
      expect(logs).toHaveLength(2);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('UpdateOne', () => {
    it('beforeSaveCallback should set updatedBy from user and afterSave should create audit log', async () => {
      const { body: created } = await server.post('/items', { name: 'to-update' }, auth()) as any;

      const { body: updated, status } = await server.patch(
        `/items/${created.id}`,
        { name: 'updated-name' },
        auth(),
      ) as any;

      expect(status).toBe(200);
      expect(updated.updatedBy).toBe(userEmail);
      expect(updated.name).toBe('updated-name');

      const logs = await getAuditLogs('UpdateOne');
      expect(logs).toHaveLength(1);
      expect(logs[0].performedBy).toBe(userEmail);
    });
  });

  describe('UpdateMany', () => {
    it('beforeSaveCallback should set updatedBy from user and afterSave should create audit logs', async () => {
      const { body: items } = await server.post(
        '/items/many',
        { list: [{ name: 'um-1' }, { name: 'um-2' }] },
        auth(),
      ) as any;
      const ids = items.map((i: any) => i.id);

      const { body: updated, status } = await server.patch(
        '/items',
        { name: 'bulk-updated' },
        { ...auth(), query: { ids } },
      ) as any;

      expect(status).toBe(200);
      expect(updated).toHaveLength(2);
      expect(updated.every((u: any) => u.updatedBy === userEmail)).toBe(true);

      const logs = await getAuditLogs('UpdateMany');
      expect(logs).toHaveLength(2);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('ReplaceOne', () => {
    it('beforeSaveCallback should set updatedBy from user and afterSave should create audit log', async () => {
      const { body: created } = await server.post('/items', { name: 'to-replace' }, auth()) as any;

      const { body: replaced, status } = await server.put(
        `/items/${created.id}`,
        { name: 'replaced-name' },
        auth(),
      ) as any;

      expect(status).toBe(200);
      expect(replaced.updatedBy).toBe(userEmail);
      expect(replaced.name).toBe('replaced-name');

      const logs = await getAuditLogs('ReplaceOne');
      expect(logs).toHaveLength(1);
      expect(logs[0].performedBy).toBe(userEmail);
    });
  });

  describe('DuplicateOne', () => {
    it('beforeSaveCallback should set createdBy from user and afterSave should create audit log', async () => {
      const { body: created } = await server.post('/items', { name: 'to-dup' }, auth()) as any;

      const { body: duplicated, status } = await server.post(
        `/items/duplicate/${created.id}`,
        { name: 'dup-name' },
        auth(),
      ) as any;

      expect(status).toBe(201);
      expect(duplicated.createdBy).toBe(userEmail);

      const logs = await getAuditLogs('DuplicateOne');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        entityId: duplicated.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('DuplicateMany', () => {
    it('beforeSaveCallback should set createdBy from user and afterSave should create audit logs', async () => {
      const { body: items } = await server.post(
        '/items/many',
        { list: [{ name: 'dm-1' }, { name: 'dm-2' }] },
        auth(),
      ) as any;
      const ids = items.map((i: any) => i.id);

      const { body: duplicated, status } = await server.post(
        '/items/duplicate',
        {},
        { ...auth(), query: { ids } },
      ) as any;

      expect(status).toBe(201);
      expect(duplicated).toHaveLength(2);
      expect(duplicated.every((d: any) => d.createdBy === userEmail)).toBe(true);

      const logs = await getAuditLogs('DuplicateMany');
      expect(logs).toHaveLength(2);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('DeleteOne', () => {
    it('beforeSaveCallback and afterSave should both create audit logs with user', async () => {
      const { body: created } = await server.post('/items', { name: 'to-delete' }, auth()) as any;

      const { body, status } = await server.delete(`/items/${created.id}`, auth()) as any;

      expect(status).toBe(200);
      expect(body.deletedCount).toBe(1);

      const beforeLogs = await getAuditLogs('DeleteOne-before');
      expect(beforeLogs).toHaveLength(1);
      expect(beforeLogs[0].performedBy).toBe(userEmail);

      const afterLogs = await getAuditLogs('DeleteOne');
      expect(afterLogs).toHaveLength(1);
      expect(afterLogs[0]).toEqual(expect.objectContaining({
        entityId: created.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('DeleteMany', () => {
    it('beforeSaveCallback and afterSave should both create audit logs with user', async () => {
      const { body: items } = await server.post(
        '/items/many',
        { list: [{ name: 'del-1' }, { name: 'del-2' }] },
        auth(),
      ) as any;
      const ids = items.map((i: any) => i.id);

      const { body, status } = await server.delete('/items', { ...auth(), query: { ids } }) as any;

      expect(status).toBe(200);
      expect(body.deletedCount).toBe(2);

      const beforeLogs = await getAuditLogs('DeleteMany-before');
      expect(beforeLogs).toHaveLength(2);
      expect(beforeLogs.every((l: any) => l.performedBy === userEmail)).toBe(true);

      const afterLogs = await getAuditLogs('DeleteMany');
      expect(afterLogs).toHaveLength(2);
      expect(afterLogs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('GetOne', () => {
    it('afterSave callback should create audit log with user', async () => {
      const { body: created } = await server.post('/items', { name: 'get-one-item' }, auth()) as any;

      const { status } = await server.get(`/items/${created.id}`, auth()) as any;
      expect(status).toBe(200);

      const logs = await getAuditLogs('GetOne');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        entityId: created.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('GetMany', () => {
    it('afterSave callback should create audit logs with user for each returned entity', async () => {
      await server.post(
        '/items/many',
        { list: [{ name: 'gm-1' }, { name: 'gm-2' }] },
        auth(),
      );

      const { body: items, status } = await server.get('/items', auth()) as any;
      expect(status).toBe(200);

      const logs = await getAuditLogs('GetMany');
      // One audit log per entity returned
      expect(logs.length).toBe(items.length);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('Aggregate', () => {
    it('afterSave callback should create audit logs with user for each aggregated entity', async () => {
      await server.post(
        '/items/many',
        { list: [{ name: 'agg-1' }, { name: 'agg-2' }] },
        auth(),
      );

      const { body: items, status } = await server.get(
        '/items/aggregate',
        { ...auth(), query: { name: 'agg-1' } },
      ) as any;

      expect(status).toBe(200);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('agg-1');

      const logs = await getAuditLogs('Aggregate');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        entityId: items[0].id,
        performedBy: userEmail,
      }));
    });
  });
});

// ── WebSocket Tests ──────────────────────────────────────────────

/**
 * WebSocket variant — same callbacks, but exercised through socket events.
 * Verifies that the authenticated socket user is forwarded to
 * beforeSaveCallback / afterSave callback just like the HTTP flow.
 */
describe('Callbacks receive authenticated user via WebSocket (e2e)', () => {
  const { UserEntity, ItemEntity, AuditLogEntity } = buildEntities('cb-ws');
  const callbacks = buildCallbacks(AuditLogEntity, 'WS-');
  const wsRoutes = buildRoutes(callbacks, { webSocket: true });

  // ── Setup / teardown ──────────────────────────────────────────────

  let accessToken: string;
  const userEmail = 'ws-cb-test@test.co';
  const userPassword = 'test';

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();

    const uri = process.env.MONGO_DB_URL;

    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(uri, {
          useAuth: { userEntity: UserEntity, webSocket: true },
        }),
        DynamicApiModule.forFeature({
          entity: ItemEntity,
          controllerOptions: { path: 'items' },
          routes: wsRoutes,
        }),
        DynamicApiModule.forFeature({
          entity: AuditLogEntity,
          controllerOptions: { path: 'audit-logs' },
        }),
      ],
    }).compile();

    await createTestingApp(
      moduleRef,
      undefined,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new TestSocketAdapter(app));
      },
    );

    // Register & login via WebSocket to get a JWT
    const registerResult = await server.emit(
      'auth-register',
      { email: userEmail, password: userPassword },
    ) as any;
    accessToken = registerResult.accessToken;
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ── Helpers ───────────────────────────────────────────────────────

  const wsAuth = () => ({ accessToken });

  const getAuditLogs = async (action: string): Promise<any[]> => {
    const { body } = await server.get('/audit-logs', { authToken: accessToken }) as any;
    return (body as any[]).filter((log: any) => log.action === action);
  };

  // ── Tests ─────────────────────────────────────────────────────────

  describe('CreateOne', () => {
    it('beforeSaveCallback should set createdBy from socket user and afterSave should create audit log', async () => {
      const result = await server.emit(
        'create-one-item-entity',
        { name: 'ws-item-1' },
        wsAuth(),
      ) as any;

      expect(result).toEqual(expect.objectContaining({ name: 'ws-item-1', createdBy: userEmail }));

      const logs = await getAuditLogs('WS-CreateOne');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        action: 'WS-CreateOne',
        entityId: result.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('CreateMany', () => {
    it('beforeSaveCallback should set createdBy from socket user and afterSave should create audit logs', async () => {
      const result = await server.emit(
        'create-many-item-entity',
        { list: [{ name: 'ws-a' }, { name: 'ws-b' }] },
        wsAuth(),
      ) as any;

      expect(result).toHaveLength(2);
      expect(result[0].createdBy).toBe(userEmail);
      expect(result[1].createdBy).toBe(userEmail);

      const logs = await getAuditLogs('WS-CreateMany');
      expect(logs).toHaveLength(2);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('UpdateOne', () => {
    it('beforeSaveCallback should set updatedBy from socket user and afterSave should create audit log', async () => {
      const created = await server.emit(
        'create-one-item-entity',
        { name: 'ws-to-update' },
        wsAuth(),
      ) as any;

      const updated = await server.emit(
        'update-one-item-entity',
        { id: created.id, name: 'ws-updated' },
        wsAuth(),
      ) as any;

      expect(updated.updatedBy).toBe(userEmail);
      expect(updated.name).toBe('ws-updated');

      const logs = await getAuditLogs('WS-UpdateOne');
      expect(logs).toHaveLength(1);
      expect(logs[0].performedBy).toBe(userEmail);
    });
  });

  describe('UpdateMany', () => {
    it('beforeSaveCallback should set updatedBy from socket user and afterSave should create audit logs', async () => {
      const items = await server.emit(
        'create-many-item-entity',
        { list: [{ name: 'ws-um-1' }, { name: 'ws-um-2' }] },
        wsAuth(),
      ) as any;
      const ids = items.map((i: any) => i.id);

      const updated = await server.emit(
        'update-many-item-entity',
        { ids, name: 'ws-bulk-updated' },
        wsAuth(),
      ) as any;

      expect(updated).toHaveLength(2);
      expect(updated.every((u: any) => u.updatedBy === userEmail)).toBe(true);

      const logs = await getAuditLogs('WS-UpdateMany');
      expect(logs).toHaveLength(2);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('ReplaceOne', () => {
    it('beforeSaveCallback should set updatedBy from socket user and afterSave should create audit log', async () => {
      const created = await server.emit(
        'create-one-item-entity',
        { name: 'ws-to-replace' },
        wsAuth(),
      ) as any;

      const replaced = await server.emit(
        'replace-one-item-entity',
        { id: created.id, name: 'ws-replaced' },
        wsAuth(),
      ) as any;

      expect(replaced.updatedBy).toBe(userEmail);
      expect(replaced.name).toBe('ws-replaced');

      const logs = await getAuditLogs('WS-ReplaceOne');
      expect(logs).toHaveLength(1);
      expect(logs[0].performedBy).toBe(userEmail);
    });
  });

  describe('DuplicateOne', () => {
    it('beforeSaveCallback should set createdBy from socket user and afterSave should create audit log', async () => {
      const created = await server.emit(
        'create-one-item-entity',
        { name: 'ws-to-dup' },
        wsAuth(),
      ) as any;

      const duplicated = await server.emit(
        'duplicate-one-item-entity',
        { id: created.id, name: 'ws-dup-name' },
        wsAuth(),
      ) as any;

      expect(duplicated.createdBy).toBe(userEmail);

      const logs = await getAuditLogs('WS-DuplicateOne');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        entityId: duplicated.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('DuplicateMany', () => {
    it('beforeSaveCallback should set createdBy from socket user and afterSave should create audit logs', async () => {
      const items = await server.emit(
        'create-many-item-entity',
        { list: [{ name: 'ws-dm-1' }, { name: 'ws-dm-2' }] },
        wsAuth(),
      ) as any;
      const ids = items.map((i: any) => i.id);

      const duplicated = await server.emit(
        'duplicate-many-item-entity',
        { ids },
        wsAuth(),
      ) as any;

      expect(duplicated).toHaveLength(2);
      expect(duplicated.every((d: any) => d.createdBy === userEmail)).toBe(true);

      const logs = await getAuditLogs('WS-DuplicateMany');
      expect(logs).toHaveLength(2);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('DeleteOne', () => {
    it('beforeSaveCallback and afterSave should both create audit logs with socket user', async () => {
      const created = await server.emit(
        'create-one-item-entity',
        { name: 'ws-to-delete' },
        wsAuth(),
      ) as any;

      const deleteResult = await server.emit(
        'delete-one-item-entity',
        { id: created.id },
        wsAuth(),
      ) as any;

      expect(deleteResult.deletedCount).toBe(1);

      const beforeLogs = await getAuditLogs('WS-DeleteOne-before');
      expect(beforeLogs).toHaveLength(1);
      expect(beforeLogs[0].performedBy).toBe(userEmail);

      const afterLogs = await getAuditLogs('WS-DeleteOne');
      expect(afterLogs).toHaveLength(1);
      expect(afterLogs[0]).toEqual(expect.objectContaining({
        entityId: created.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('DeleteMany', () => {
    it('beforeSaveCallback and afterSave should both create audit logs with socket user', async () => {
      const items = await server.emit(
        'create-many-item-entity',
        { list: [{ name: 'ws-del-1' }, { name: 'ws-del-2' }] },
        wsAuth(),
      ) as any;
      const ids = items.map((i: any) => i.id);

      const deleteResult = await server.emit(
        'delete-many-item-entity',
        { ids },
        wsAuth(),
      ) as any;

      expect(deleteResult.deletedCount).toBe(2);

      const beforeLogs = await getAuditLogs('WS-DeleteMany-before');
      expect(beforeLogs).toHaveLength(2);
      expect(beforeLogs.every((l: any) => l.performedBy === userEmail)).toBe(true);

      const afterLogs = await getAuditLogs('WS-DeleteMany');
      expect(afterLogs).toHaveLength(2);
      expect(afterLogs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('GetOne', () => {
    it('afterSave callback should create audit log with socket user', async () => {
      const created = await server.emit(
        'create-one-item-entity',
        { name: 'ws-get-one-item' },
        wsAuth(),
      ) as any;

      const result = await server.emit(
        'get-one-item-entity',
        { id: created.id },
        wsAuth(),
      ) as any;

      expect(result).toEqual(expect.objectContaining({ id: created.id }));

      const logs = await getAuditLogs('WS-GetOne');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        entityId: created.id,
        performedBy: userEmail,
      }));
    });
  });

  describe('GetMany', () => {
    it('afterSave callback should create audit logs with socket user for each returned entity', async () => {
      const items = await server.emit(
        'create-many-item-entity',
        { list: [{ name: 'ws-gm-1' }, { name: 'ws-gm-2' }] },
        wsAuth(),
      ) as any;

      const result = await server.emit(
        'get-many-item-entity',
        {},
        wsAuth(),
      ) as any;

      expect(result.length).toBeGreaterThanOrEqual(items.length);

      const logs = await getAuditLogs('WS-GetMany');
      expect(logs.length).toBe(result.length);
      expect(logs.every((l: any) => l.performedBy === userEmail)).toBe(true);
    });
  });

  describe('Aggregate', () => {
    it('afterSave callback should create audit logs with socket user for each aggregated entity', async () => {
      await server.emit(
        'create-many-item-entity',
        { list: [{ name: 'ws-agg-1' }, { name: 'ws-agg-2' }] },
        wsAuth(),
      );

      const result = await server.emit(
        'aggregate-aggregate-item-entity',
        { name: 'ws-agg-1' },
        wsAuth(),
      ) as any;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ws-agg-1');

      const logs = await getAuditLogs('WS-Aggregate');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(expect.objectContaining({
        entityId: result[0].id,
        performedBy: userEmail,
      }));
    });
  });
});
