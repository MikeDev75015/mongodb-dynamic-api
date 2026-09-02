import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import { initApp } from '../shared';
import { getModelFromEntity } from '../utils';
import 'dotenv/config';

@Schema({ collection: 'e2e-audit-log-items' })
class ItemEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;
}

type AuditLogEntry = {
  action: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  user: unknown;
  timestamp: Date;
};

const getAuditLogEntries = async (): Promise<AuditLogEntry[]> => {
  const model = await getModelFromEntity(ItemEntity);
  return model.db.collection('e2e-audit-log-items_audit_log').find().toArray() as unknown as Promise<AuditLogEntry[]>;
};

describe('DynamicApiModule forFeature - audit log (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('routes with auditLog: true', () => {
    beforeEach(async () => {
      await initApp({
        entity: ItemEntity,
        controllerOptions: { path: 'audit-items' },
        routes: [
          { type: 'CreateOne', auditLog: true },
          { type: 'UpdateOne', auditLog: true },
          { type: 'ReplaceOne', auditLog: true },
          { type: 'DuplicateOne', auditLog: true },
          { type: 'DeleteOne', auditLog: true },
        ],
      });
    });

    it('writes a create entry with before: null and the created document as after', async () => {
      const { status, body } = await server.post('/audit-items', { name: 'first' });
      expect(status).toBe(201);

      const entries = await getAuditLogEntries();
      const entry = entries.find((e) => e.action === 'create');

      expect(entry).toMatchObject({
        action: 'create',
        entityId: body.id,
        before: null,
        after: { name: 'first' },
      });
    });

    it('writes an update entry with the before and after documents', async () => {
      const { body: created } = await server.post('/audit-items', { name: 'to-update' });

      const { status } = await server.patch(`/audit-items/${created.id}`, { name: 'updated' });
      expect(status).toBe(200);

      const entries = await getAuditLogEntries();
      const entry = entries.find((e) => e.action === 'update');

      expect(entry).toMatchObject({
        action: 'update',
        entityId: created.id,
        before: { name: 'to-update' },
        after: { name: 'updated' },
      });
    });

    it('writes a replace entry with the before and after documents', async () => {
      const { body: created } = await server.post('/audit-items', { name: 'to-replace' });

      const { status } = await server.put(`/audit-items/${created.id}`, { name: 'replaced' });
      expect(status).toBe(200);

      const entries = await getAuditLogEntries();
      const entry = entries.find((e) => e.action === 'replace');

      expect(entry).toMatchObject({
        action: 'replace',
        entityId: created.id,
        before: { name: 'to-replace' },
        after: { name: 'replaced' },
      });
    });

    it('writes a duplicate entry with before: null and the duplicated document as after', async () => {
      const { body: created } = await server.post('/audit-items', { name: 'to-duplicate' });

      const { status, body: duplicated } = await server.post(`/audit-items/duplicate/${created.id}`, {});
      expect(status).toBe(201);

      const entries = await getAuditLogEntries();
      const entry = entries.find((e) => e.action === 'duplicate');

      expect(entry).toMatchObject({
        action: 'duplicate',
        entityId: duplicated.id,
        before: null,
        after: { name: 'to-duplicate' },
      });
    });

    it('writes a delete entry with the deleted document as before and after: null', async () => {
      const { body: created } = await server.post('/audit-items', { name: 'to-delete' });

      const { status } = await server.delete(`/audit-items/${created.id}`);
      expect(status).toBe(200);

      const entries = await getAuditLogEntries();
      const entry = entries.find((e) => e.action === 'delete');

      expect(entry).toMatchObject({
        action: 'delete',
        entityId: created.id,
        before: { name: 'to-delete' },
        after: null,
      });
    });
  });

  describe('routes without auditLog configured', () => {
    beforeEach(async () => {
      await initApp({
        entity: ItemEntity,
        controllerOptions: { path: 'audit-items' },
        routes: [{ type: 'CreateOne' }],
      });
    });

    it('does not write any audit log entry', async () => {
      const { status } = await server.post('/audit-items', { name: 'no-audit' });
      expect(status).toBe(201);

      const entries = await getAuditLogEntries();
      expect(entries).toHaveLength(0);
    });
  });
});
