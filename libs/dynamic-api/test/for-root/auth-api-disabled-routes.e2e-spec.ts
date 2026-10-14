import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createRegisterUserEntity, initModule, REGISTER_ADMIN } from '../shared';

describe('DynamicApiModule forRoot - register.disabled / updateAccount.disabled (e2e)', () => {
  const User = createRegisterUserEntity();
  type User = InstanceType<typeof User>;

  const admin = REGISTER_ADMIN;
  let app: INestApplication;

  const fixtures = async (_: Connection) => {
    const bcryptService = new BcryptService();
    const model = await getModelFromEntity(User);
    await model.insertMany([{ ...admin, password: await bcryptService.hashPassword(admin.password) }]);
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('register.disabled: true', () => {
    beforeEach(async () => {
      app = await initModule({
        useAuth: {
          userEntity: User,
          register: { disabled: true, protected: true, abilityPredicate: () => true },
        },
      }, fixtures);
    });

    it('should answer 404 even for an authenticated caller', async () => {
      const { body: { accessToken } } = await server.post('/auth/login', { email: admin.email, password: admin.password });

      const { body, status } = await server.post(
        '/auth/register',
        { email: 'new@test.co', password: 'new-password' },
        { authToken: accessToken },
      );

      expect(status).toBe(404);
      expect(body).toEqual({ error: 'Not Found', message: 'Cannot POST /auth/register', statusCode: 404 });
    });

    it('should leave the other auth routes in place', async () => {
      const { body: { accessToken } } = await server.post('/auth/login', { email: admin.email, password: admin.password });

      const { status } = await server.get('/auth/account', { authToken: accessToken });

      expect(status).toBe(200);
    });

    it('should be absent from the OpenAPI document', () => {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

      expect(document.paths['/auth/register']).toBeUndefined();
      expect(document.paths['/auth/login']).toBeDefined();
      expect(document.paths['/auth/account']).toBeDefined();
    });
  });

  describe('updateAccount.disabled: true', () => {
    beforeEach(async () => {
      app = await initModule({
        useAuth: { userEntity: User, updateAccount: { disabled: true } },
      }, fixtures);
    });

    it('should answer 404 even for an authenticated caller', async () => {
      const { body: { accessToken } } = await server.post('/auth/login', { email: admin.email, password: admin.password });

      const { body, status } = await server.patch('/auth/account', { role: 'client' }, { authToken: accessToken });

      expect(status).toBe(404);
      expect(body).toEqual({ error: 'Not Found', message: 'Cannot PATCH /auth/account', statusCode: 404 });
    });

    it('should keep GET /auth/account and POST /auth/register', async () => {
      const { body: { accessToken } } = await server.post('/auth/login', { email: admin.email, password: admin.password });

      const { status: getStatus } = await server.get('/auth/account', { authToken: accessToken });
      const { status: registerStatus } = await server.post('/auth/register', { email: 'new@test.co', password: 'new-password' });

      expect(getStatus).toBe(200);
      expect(registerStatus).toBe(201);
    });

    it('should only drop the PATCH operation from the OpenAPI document', () => {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

      expect(document.paths['/auth/account']?.get).toBeDefined();
      expect(document.paths['/auth/account']?.patch).toBeUndefined();
    });
  });

  describe('default (not disabled)', () => {
    beforeEach(async () => {
      app = await initModule({ useAuth: { userEntity: User } }, fixtures);
    });

    it('should declare both routes', () => {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

      expect(document.paths['/auth/register']?.post).toBeDefined();
      expect(document.paths['/auth/account']?.patch).toBeDefined();
    });
  });
});
