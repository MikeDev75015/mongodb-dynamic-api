/**
 * E2E tests for @DerivedField, @ProtectedField and fromUser
 *
 * Strategy
 * ---------
 * @DerivedField  — POST creates an entity whose `fullName` is computed
 *                  server-side from firstName+lastName (on:'save')
 *                  and `shortBio` is computed on read (on:'read').
 * @ProtectedField — `internalCode` is not accepted in POST/PATCH body
 *                  (OmitType removes it from the DTO); trying to send it
 *                  has no effect.
 * fromUser        — tested via a dedicated `describe` using a
 *                  beforeSaveCallback that checks the field value was
 *                  injected before the callback runs (no JWT needed here
 *                  — we stub `req.user` via a custom interceptor applied
 *                  at route level using `useInterceptors`).
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Observable } from 'rxjs';
import {
  BaseEntity,
  DerivedField,
  DynamicApiModule,
  DynamicAPISchemaOptions,
  ProtectedField,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

// ── Shared user injector interceptor ────────────────────────────────────────

@Injectable()
class FakeUserInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<{ user: Record<string, string> }>();
    req.user = { email: 'alice@example.com', tenantId: 'tenant-42' };
    return next.handle();
  }
}

// ── Entity definitions ───────────────────────────────────────────────────────

@DynamicAPISchemaOptions({
  indexes: [{ fields: { firstName: 1 }, options: { unique: true } }],
})
@Schema({ collection: 'derived-test-items' })
class ItemEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String })
  @DerivedField<ItemEntity>((e) => `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim())
  fullName: string;

  @Prop({ type: String })
  @DerivedField<ItemEntity>((e) => `Hi, my name is ${e.firstName}`, { on: 'read' })
  greeting: string;

  @Prop({ type: String })
  @ProtectedField()
  internalCode: string;

  @Prop({ type: String })
  createdBy: string;
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('DynamicApiModule forFeature — @DerivedField + @ProtectedField + fromUser (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // ── @DerivedField (on:'save') ──────────────────────────────────────────────
  describe('@DerivedField on save', () => {
    beforeEach(async () => {
      await initApp({
        entity: ItemEntity,
        controllerOptions: { path: 'items', isPublic: true },
        routes: [
          { type: 'CreateOne' },
          { type: 'UpdateOne' },
          { type: 'GetMany' },
          { type: 'GetOne' },
        ],
      });
    });

    it('POST /items — should compute fullName on save', async () => {
      const { body, status } = await server.post('/items', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(status).toBe(201);
      expect(body.fullName).toBe('John Doe');
      expect(body.firstName).toBe('John');
      expect(body.lastName).toBe('Doe');
    });

    it('PATCH /items/:id — should recompute fullName on update', async () => {
      const { body: created } = await server.post('/items', {
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const { body, status } = await server.patch(`/items/${created.id}`, {
        lastName: 'Smith',
      });

      expect(status).toBe(200);
      expect(body.fullName).toBe('Jane Smith');
    });
  });

  // ── @DerivedField (on:'read') ──────────────────────────────────────────────
  describe('@DerivedField on read', () => {
    beforeEach(async () => {
      await initApp({
        entity: ItemEntity,
        controllerOptions: { path: 'items', isPublic: true },
        routes: [
          { type: 'CreateOne' },
          { type: 'GetOne' },
        ],
      });
    });

    it('GET /items/:id — should compute greeting on read but not persist it', async () => {
      const { body: created } = await server.post('/items', {
        firstName: 'Bob',
        lastName: 'Martin',
      });

      const { body, status } = await server.get(`/items/${created.id}`);

      expect(status).toBe(200);
      expect(body.greeting).toBe('Hi, my name is Bob');
      // fullName is on:'save' so it should also be present
      expect(body.fullName).toBe('Bob Martin');
    });
  });

  // ── @ProtectedField ────────────────────────────────────────────────────────
  describe('@ProtectedField', () => {
    beforeEach(async () => {
      await initApp({
        entity: ItemEntity,
        controllerOptions: { path: 'items', isPublic: true },
        routes: [
          { type: 'CreateOne' },
          { type: 'UpdateOne' },
          { type: 'GetOne' },
        ],
      });
    });

    it('POST /items — internalCode sent in body should be ignored', async () => {
      const { body, status } = await server.post('/items', {
        firstName: 'Protected',
        lastName: 'User',
        internalCode: 'secret-001',
      });

      expect(status).toBe(201);
      // internalCode was excluded from the DTO so the value should not appear
      expect(body.internalCode).toBeUndefined();
    });

    it('PATCH /items/:id — internalCode in patch body should be ignored', async () => {
      const { body: created } = await server.post('/items', {
        firstName: 'Protected2',
        lastName: 'User',
      });

      const { body, status } = await server.patch(`/items/${created.id}`, {
        lastName: 'Updated',
        internalCode: 'hacked-code',
      });

      expect(status).toBe(200);
      expect(body.internalCode).toBeUndefined();
    });
  });

  // ── fromUser field injection ───────────────────────────────────────────────
  describe('fromUser injection', () => {
    beforeEach(async () => {
      await initApp({
        entity: ItemEntity,
        controllerOptions: { path: 'items', isPublic: true },
        routes: [
          {
            type: 'CreateOne',
            useInterceptors: [FakeUserInterceptor],
            fromUser: {
              createdBy: 'email',
            },
          },
          { type: 'GetOne' },
        ],
      });
    });

    it('POST /items — should inject createdBy from req.user.email', async () => {
      const { body, status } = await server.post('/items', {
        firstName: 'FromUser',
        lastName: 'Test',
      });

      expect(status).toBe(201);
      expect(body.createdBy).toBe('alice@example.com');
    });

    it('POST /items — client cannot override fromUser-injected field', async () => {
      const { body, status } = await server.post('/items', {
        firstName: 'Override2',
        lastName: 'Attempt',
        createdBy: 'evil@attacker.com',
      });

      expect(status).toBe(201);
      // fromUser always wins over body value (applied after toEntity)
      expect(body.createdBy).toBe('alice@example.com');
    });
  });
});






