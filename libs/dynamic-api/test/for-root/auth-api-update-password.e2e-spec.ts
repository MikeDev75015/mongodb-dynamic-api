import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createUpdatePasswordUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - PATCH /auth/account/password (e2e)', () => {
  const User = createUpdatePasswordUserEntity();
  type User = InstanceType<typeof User>;

  const user = { email: 'user@test.co', password: 'user-password', isVerified: true };
  const unverified = { email: 'unverified@test.co', password: 'unverified-password', isVerified: false };

  let model: mongoose.Model<User>;

  const fixtures = async (_: Connection) => {
    const bcryptService = new BcryptService();
    model = await getModelFromEntity(User);
    await model.insertMany([
      { ...user, password: await bcryptService.hashPassword(user.password) },
      { ...unverified, password: await bcryptService.hashPassword(unverified.password) },
    ]);
  };

  const loginAs = async ({ email, password }: { email: string; password: string }) => {
    const { body } = await server.post('/auth/login', { email, password });
    return body as { accessToken: string; refreshToken: string };
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('without updatePassword options', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await initModule({ useAuth: { userEntity: User } }, fixtures);
    });

    it('should not declare the route at all (404, even with a valid access token)', async () => {
      const { accessToken } = await loginAs(user);

      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'new-password' },
        { authToken: accessToken },
      );

      expect(status).toBe(404);
      expect(body).toEqual({
        error: 'Not Found',
        message: 'Cannot PATCH /auth/account/password',
        statusCode: 404,
      });
    });

    it('should not appear in the OpenAPI document', () => {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

      expect(document.paths['/auth/account/password']).toBeUndefined();
      expect(document.paths['/auth/account']).toBeDefined();
    });
  });

  describe('with updatePassword options', () => {
    const beforeSaveCallback = vi.fn();
    const callback = vi.fn();
    let app: INestApplication;

    beforeEach(async () => {
      beforeSaveCallback.mockReset().mockImplementation(async (entity: User) => entity);
      callback.mockReset().mockResolvedValue(undefined);

      app = await initModule({
        useAuth: {
          userEntity: User,
          password: { minLength: 8 },
          updatePassword: {
            abilityPredicate: (current: User) => current.isVerified,
            beforeSaveCallback,
            callback,
          },
          login: { additionalFields: ['isVerified'] },
          refreshToken: { refreshTokenField: 'refreshTokenHash', revokeSessionsOnPasswordChange: true },
        },
      }, fixtures);
    });

    it('should declare the route in the OpenAPI document as a bearer-protected PATCH', () => {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
      const operation = document.paths['/auth/account/password']?.patch;

      expect(operation).toBeDefined();
      expect(operation.security).toEqual([{ bearer: [] }]);
    });

    it('should return 401 when the access token is missing', async () => {
      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'new-password' },
      );

      expect(status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized', statusCode: 401 });
    });

    it('should return 403 when the ability predicate rejects the user', async () => {
      const { accessToken } = await loginAs(unverified);

      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: unverified.password, newPassword: 'new-password' },
        { authToken: accessToken },
      );

      expect(status).toBe(403);
      expect(body).toEqual({ error: 'Forbidden', message: 'Access denied', statusCode: 403 });
    });

    it.each([
      ['currentPassword', { newPassword: 'new-password' }],
      ['newPassword', { currentPassword: user.password }],
    ])('should return 400 when %s is missing', async (_field, payload) => {
      const { accessToken } = await loginAs(user);

      const { body, status } = await server.patch('/auth/account/password', payload, { authToken: accessToken });

      expect(status).toBe(400);
      expect(body).toEqual({ error: 'Bad Request', message: 'Invalid or missing argument', statusCode: 400 });
    });

    it('should return 400 with a class-validator-style message when newPassword is shorter than minLength', async () => {
      const { accessToken } = await loginAs(user);

      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'short' },
        { authToken: accessToken },
      );

      expect(status).toBe(400);
      expect(body).toEqual({
        error: 'Bad Request',
        message: ['newPassword must be longer than or equal to 8 characters'],
        statusCode: 400,
      });
      expect(beforeSaveCallback).not.toHaveBeenCalled();
    });

    it('should return 401 Invalid credentials (same as login) when currentPassword is wrong and keep the password', async () => {
      const { accessToken } = await loginAs(user);

      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: 'wrong-password', newPassword: 'new-password' },
        { authToken: accessToken },
      );

      expect(status).toBe(401);
      expect(body).toEqual({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
      expect(beforeSaveCallback).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();

      const { status: loginStatus } = await server.post('/auth/login', { email: user.email, password: user.password });
      expect(loginStatus).toBe(200);
    });

    it('should propagate the exception thrown by beforeSaveCallback and keep the password', async () => {
      beforeSaveCallback.mockRejectedValue(new BadRequestException('newPassword must differ from currentPassword'));
      const { accessToken } = await loginAs(user);

      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'new-password' },
        { authToken: accessToken },
      );

      expect(status).toBe(400);
      expect(body).toEqual({
        error: 'Bad Request',
        message: 'newPassword must differ from currentPassword',
        statusCode: 400,
      });
      expect(callback).not.toHaveBeenCalled();

      const { status: loginStatus } = await server.post('/auth/login', { email: user.email, password: user.password });
      expect(loginStatus).toBe(200);
    });

    it('should change the password, call the callbacks and never return the password', async () => {
      const { accessToken } = await loginAs(user);
      const { password: hashBefore } = await model.findOne({ email: user.email }).lean().exec();

      const { body, status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'new-password' },
        { authToken: accessToken },
      );

      expect(status).toBe(204);
      expect(body).toEqual({});

      const { password: hashAfter } = await model.findOne({ email: user.email }).lean().exec();
      expect(hashAfter).not.toBe(hashBefore);
      expect(hashAfter).not.toBe('new-password');

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String), email: user.email, password: hashBefore }),
        { currentPassword: user.password, newPassword: 'new-password', hashedPassword: hashAfter },
        expect.any(Object),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String), email: user.email, password: hashAfter }),
        expect.any(Object),
      );

      const { status: oldLoginStatus } = await server.post('/auth/login', { email: user.email, password: user.password });
      const { status: newLoginStatus } = await server.post('/auth/login', { email: user.email, password: 'new-password' });
      expect(oldLoginStatus).toBe(401);
      expect(newLoginStatus).toBe(200);
    });

    it('should revoke the refresh sessions when revokeSessionsOnPasswordChange is on', async () => {
      const { accessToken, refreshToken } = await loginAs(user);

      const { status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'new-password' },
        { authToken: accessToken },
      );
      expect(status).toBe(204);

      const { refreshTokenHash } = await model.findOne({ email: user.email }).lean().exec();
      expect(refreshTokenHash).toBeNull();

      const { body, status: refreshStatus } = await server.post('/auth/refresh-token', {}, { authToken: refreshToken });
      expect(refreshStatus).toBe(401);
      expect(body).toEqual({ error: 'Unauthorized', message: 'Invalid refresh token', statusCode: 401 });
    });
  });

  describe('with updatePassword options but no refresh token revocation', () => {
    beforeEach(async () => {
      await initModule({
        useAuth: {
          userEntity: User,
          updatePassword: {},
          refreshToken: { refreshTokenField: 'refreshTokenHash' },
        },
      }, fixtures);
    });

    it('should keep the refresh session usable after the change', async () => {
      const { accessToken, refreshToken } = await loginAs(user);

      const { status } = await server.patch(
        '/auth/account/password',
        { currentPassword: user.password, newPassword: 'new-password' },
        { authToken: accessToken },
      );
      expect(status).toBe(204);

      const { body, status: refreshStatus } = await server.post('/auth/refresh-token', {}, { authToken: refreshToken });
      expect(refreshStatus).toBe(200);
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    });
  });
});
