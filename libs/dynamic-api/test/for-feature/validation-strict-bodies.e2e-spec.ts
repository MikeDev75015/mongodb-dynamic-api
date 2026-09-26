import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E — v6: once an app configures validation itself (`validationPipeOptions`), request bodies are
 * validated with `whitelist` + `forbidNonWhitelisted` by default. Routes without any configured
 * validation keep the lenient implicit `{ transform: true }`.
 */
describe('Validation — strict bodies when validation is configured (e2e)', () => {
  @Schema({ collection: 'strict_body_notes' })
  class StrictBodyNoteEntity extends BaseEntity {
    @IsString()
    @Prop({ type: String, required: true })
    title: string;

    @IsOptional()
    @IsString()
    @Prop({ type: String })
    content?: string;
  }

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('with validationPipeOptions configured', () => {
    beforeEach(async () => {
      await initApp({
        entity: StrictBodyNoteEntity,
        controllerOptions: { path: 'strict-body-notes', isPublic: true, validationPipeOptions: { transform: true } },
        routes: [{ type: 'CreateOne' }, { type: 'UpdateOne' }, { type: 'GetMany' }],
      });
    });

    it('should create a note with declared fields only', async () => {
      const { status, body } = await server.post('/strict-body-notes', { title: 'groceries', content: 'milk' });

      expect(status).toBe(201);
      expect(body).toEqual(expect.objectContaining({ title: 'groceries', content: 'milk' }));
    });

    it('should reject an undeclared body field with a 400', async () => {
      const { status, body } = await server.post('/strict-body-notes', { title: 'groceries', ownerId: 'someone-else' });

      expect(status).toBe(400);
      expect(body.message).toEqual(['property ownerId should not exist']);
    });

    it('should reject an undeclared field on UpdateOne too', async () => {
      const { body: created } = await server.post('/strict-body-notes', { title: 'groceries' });

      const { status } = await server.patch(`/strict-body-notes/${created.id}`, { isAdmin: true });

      expect(status).toBe(400);
    });

    it('should keep GetMany query filters free-form', async () => {
      await server.post('/strict-body-notes', { title: 'groceries' });

      const { status, body } = await server.get('/strict-body-notes', { query: { title: 'groceries' } });

      expect(status).toBe(200);
      expect(body).toHaveLength(1);
    });
  });

  describe('without any validation configured', () => {
    beforeEach(async () => {
      await initApp({
        entity: StrictBodyNoteEntity,
        controllerOptions: { path: 'strict-body-notes', isPublic: true },
        routes: [{ type: 'CreateOne' }],
      });
    });

    it('should keep accepting undeclared body fields (dropped by the schema)', async () => {
      const { status, body } = await server.post('/strict-body-notes', { title: 'groceries', ownerId: 'x' });

      expect(status).toBe(201);
      expect(body).not.toHaveProperty('ownerId');
    });
  });
});
