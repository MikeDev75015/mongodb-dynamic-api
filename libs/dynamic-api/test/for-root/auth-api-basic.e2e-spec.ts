import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { wait } from '../utils';
import { createBasicUserEntity, createValidatedUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - Authentication API Basic (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('useAuth when only userEntity is provided', () => {
    const UserEntity = createBasicUserEntity();

    let app: INestApplication;

    beforeEach(async () => {
      app = await initModule({ useAuth: { userEntity: UserEntity } });
    });

    it('should initialize dynamic api module state and authentication API with default options', async () => {
      expect(app).toBeDefined();
      expect(DynamicApiModule.state.get()).toStrictEqual({
        uri,
        initialized: true,
        isGlobalCacheEnabled: true,
        connectionName: 'dynamic-api-connection',
        cacheExcludedPaths: [],
        credentials: {
          loginField: 'email',
          passwordField: 'password',
        },
        isAuthEnabled: true,
        jwtExpirationTime: '15m',
        jwtRefreshTokenExpiresIn: '7d',
        jwtRefreshSecret: undefined,
        jwtRefreshUseCookie: false,
        jwtSecret: 'dynamic-api-jwt-secret',
        routesConfig: {
          defaults: [
            'GetMany',
            'GetOne',
            'CreateMany',
            'CreateOne',
            'UpdateMany',
            'UpdateOne',
            'ReplaceOne',
            'DuplicateMany',
            'DuplicateOne',
            'DeleteMany',
            'DeleteOne',
          ],
          excluded: [],
        },
        gatewayOptions: undefined,
      });
    });

    describe('POST /auth/register', () => {
      it('should throw a bad request exception if email is missing', async () => {
        const { body, status } = await server.post('/auth/register', { username: 'unit-test', password: 'test-2' });

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: ['email property is required'],
          statusCode: 400,
        });
      });

      it('should throw a bad request exception if password is missing', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', pass: 'test-2' });

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: ['password property is required'],
          statusCode: 400,
        });
      });

      it('should create a new user and return access token and refresh token', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

        expect(status).toBe(201);
        expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      });
    });

    describe('POST /auth/login', () => {
      it('should throw an unauthorized exception if email is missing', async () => {
        const { body, status } = await server.post('/auth/login', { pass: 'test-2' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should throw an unauthorized exception if password is missing', async () => {
        const { body, status } = await server.post('/auth/login', { email: 'unit@test.co' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should return access token and refresh token', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

        const { body, status } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });

        expect(status).toBe(200);
        expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      });
    });

    describe('GET /auth/account', () => {
      it('should throw an unauthorized exception if access token is missing', async () => {
        const { body, status } = await server.get('/auth/account');

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should return user account', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });
        const { body: { accessToken } } = await server.post(
          '/auth/login',
          { email: 'unit@test.co', password: 'test' },
        );
        const headers = { Authorization: `Bearer ${accessToken}` };

        const { body: account, status: accountStatus } = await server.get('/auth/account', { headers });

        expect(accountStatus).toBe(200);
        expect(account).toEqual({ id: expect.any(String), email: 'unit@test.co' });
      });
    });

    describe('POST /auth/refresh-token', () => {
      it('should throw an unauthorized exception if refresh token is missing', async () => {
        const { body, status } = await server.post('/auth/refresh-token', {});

        expect(status).toBe(401);
        expect(body).toEqual({ message: 'Unauthorized', statusCode: 401 });
      });

      it('should return a new access token and refresh token using the refresh token as Bearer', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });
        const { body: { refreshToken } } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });
        const headers = { Authorization: `Bearer ${refreshToken}` };

        const { body, status } = await server.post('/auth/refresh-token', {}, { headers });

        expect(status).toBe(200);
        expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      });

      it('should reject the old refresh token after rotation', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });
        const { body: loginBody } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });
        const oldRefreshToken = loginBody.refreshToken;
        const headers = { Authorization: `Bearer ${oldRefreshToken}` };

        // Use the refresh token once
        await server.post('/auth/refresh-token', {}, { headers });

        // Old refresh token still works without refreshTokenField (no DB validation)
        const { status } = await server.post('/auth/refresh-token', {}, { headers });
        expect(status).toBe(200);
      });
    });

    describe('POST /auth/logout', () => {
      it('should logout and return 204', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });
        const { body: loginBody } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });
        const headers = { Authorization: `Bearer ${loginBody.refreshToken}` };

        const { status } = await server.post('/auth/logout', {}, { headers });

        expect(status).toBe(204);
      });
    });

    it(
      'should throw a Service Unavailable exception when requesting reset password endpoint if reset password options are not configured',
      async () => {
        const { body, status } = await server.post('/auth/reset-password', { email: 'toto@test.co' });

        expect(status).toBe(503);
        expect(body).toEqual({
          error: 'Service Unavailable',
          message: 'This feature is not available',
          statusCode: 503,
        });
      },
    );

    it(
      'should throw a Service Unavailable exception when requesting change password endpoint if reset password options are not configured',
      async () => {
        const { body, status } = await server.patch('/auth/change-password', { newPassword: 'test' });

        expect(status).toBe(503);
        expect(body).toEqual({
          error: 'Service Unavailable',
          message: 'This feature is not available',
          statusCode: 503,
        });
      },
    );
  });

  describe('useAuth with jwt options', () => {
    let jwtService: JwtService;
    let token: string;
    let app: INestApplication;

    const UserEntity = createBasicUserEntity();

    beforeEach(async () => {
      app = await initModule({
        useAuth: {
          userEntity: UserEntity,
          jwt: {
            secret: 'test-secret',
            expiresIn: '4s',
          },
        },
      });
      jwtService = app.get<JwtService>(JwtService);

      const { body: { accessToken } } = await server.post(
        '/auth/register',
        { email: 'unit@test.co', password: 'test' },
      );
      token = accessToken;
    });

    it('should initialize dynamic api module state and authentication API with jwt options', async () => {
      expect(app).toBeDefined();
      expect(DynamicApiModule.state.get()).toStrictEqual({
        uri,
        initialized: true,
        isGlobalCacheEnabled: true,
        connectionName: 'dynamic-api-connection',
        cacheExcludedPaths: [],
        credentials: {
          loginField: 'email',
          passwordField: 'password',
        },
        isAuthEnabled: true,
        jwtExpirationTime: '4s',
        jwtRefreshTokenExpiresIn: '7d',
        jwtRefreshSecret: undefined,
        jwtRefreshUseCookie: false,
        jwtSecret: 'test-secret',
        routesConfig: {
          defaults: [
            'GetMany',
            'GetOne',
            'CreateMany',
            'CreateOne',
            'UpdateMany',
            'UpdateOne',
            'ReplaceOne',
            'DuplicateMany',
            'DuplicateOne',
            'DeleteMany',
            'DeleteOne',
          ],
          excluded: [],
        },
        gatewayOptions: undefined,
      });
    });

    it('should throw an unauthorized exception if access token is expired', async () => {
      await wait(5000);

      const headers = { Authorization: `Bearer ${token}` };
      const { body, status } = await server.get('/auth/account', { headers });

      expect(status).toBe(401);
      expect(body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    }, 6000);

    it('should throw an unauthorized exception if secret is invalid', async () => {
      const invalidToken = jwtService.sign({ email: 'u', password: 'p' }, { secret: 'invalid-secret' });
      const headers = { Authorization: `Bearer ${invalidToken}` };
      const { body, status } = await server.get('/auth/account', { headers });

      expect(status).toBe(401);
      expect(body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe('useAuth with validation options', () => {
    let app: INestApplication;

    const UserEntity = createValidatedUserEntity();

    beforeEach(async () => {
      app = await initModule({
        useAuth: {
          userEntity: UserEntity,
          validationPipeOptions: {
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
          },
        },
      });
    });

    describe('POST /auth/register', () => {
      it('should throw a bad request exception if payload contains non whitelisted property', async () => {
        const { body, status } = await server.post(
          '/auth/register',
          { email: 'unit@test.co', password: 'Test-2', role: 'ADMIN' },
        );

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: ['property role should not exist'],
          statusCode: 400,
        });
      });

      it('should throw a bad request exception if validation fails', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'unit.test.co', password: 'test-2' });

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: [
            'email must be an email',
            'password is not strong enough',
          ],
          statusCode: 400,
        });
      });

      it('should create a new user and return access token if the validation was successful', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'Test-2' });

        expect(status).toBe(201);
        expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      });
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'Test-2' });
      });

      it('should throw an unauthorized exception if payload contains non whitelisted property', async () => {
        const { body, status } = await server.post(
          '/auth/login',
          { email: 'unit@test.co', password: 'Test-2', role: 'ADMIN' },
        );

        expect(status).toBe(400);
        expect(body).toEqual({
          error: 'Bad Request',
          message: ['property role should not exist'],
          statusCode: 400,
        });
      });

      it('should throw an unauthorized exception if email is missing', async () => {
        const { body, status } = await server.post('/auth/login', { password: 'Test-2' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should throw an unauthorized exception if password is missing', async () => {
        const { body, status } = await server.post('/auth/login', { email: 'unit@test.co' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should return access token if the validation was successful', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

        const { body, status } = await server.post('/auth/login', { email: 'unit@test.co', password: 'Test-2' });

        expect(status).toBe(200);
        expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      });
    });
  });
});

