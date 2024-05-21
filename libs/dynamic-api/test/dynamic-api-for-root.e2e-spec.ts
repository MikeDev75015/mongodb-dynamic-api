import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { IsEmail, IsStrongPassword } from 'class-validator';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiForRootOptions, DynamicApiModule } from '../src';
import { closeTestingApp, createTestingApp, server } from './e2e.setup';
import 'dotenv/config';
import { wait } from './utils';

describe('DynamicApiModule forRoot (e2e)', () => {
  let app: INestApplication;
  const uri = process.env.MONGO_DB_URL;

  const initModule = async (dynamicApiForRootOptions: DynamicApiForRootOptions) => {
    const moduleRef = await Test.createTestingModule({
      imports: [DynamicApiModule.forRoot(uri, dynamicApiForRootOptions)],
    }).compile();

    return createTestingApp(moduleRef);
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  it('should initialize dynamic api module state with default options', async () => {
    app = await initModule({});

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: true,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: [],
      credentials: null,
      isAuthEnabled: false,
      jwtSecret: undefined,
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
    });
  });

  it('should initialize dynamic api module state with custom options', async () => {
    app = await initModule({
      useGlobalCache: false,
      cacheOptions: {
        excludePaths: ['/fake-path'],
      },
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
    });

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: false,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: ['/fake-path'],
      credentials: null,
      isAuthEnabled: false,
      jwtSecret: undefined,
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
    });
  });

  describe('useAuth when only userEntity is provided', () => {
    @Schema()
    class UserEntity extends BaseEntity {
      @Prop({ type: String, required: true })
      email: string;

      @Prop({ type: String, required: true })
      password: string;
    }

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
      });
    });

    describe('POST /register', () => {
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

      it('should create a new user and return access token', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

        expect(status).toBe(201);
        expect(body).toEqual({ accessToken: expect.any(String) });
      });
    });

    describe('POST /login', () => {
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

      it('should return access token', async () => {
        await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

        const { body, status } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });

        expect(status).toBe(200);
        expect(body).toEqual({ accessToken: expect.any(String) });
      });
    });

    describe('GET /account', () => {
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
        const { body: { accessToken } } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });
        const headers = { Authorization: `Bearer ${accessToken}` };

        const { body: account, status: accountStatus } = await server.get('/auth/account', { headers });

        expect(accountStatus).toBe(200);
        expect(account).toEqual({ id: expect.any(String), email: 'unit@test.co' });
      });
    });
  });

  describe('useAuth with userEntity and jwt options', () => {
    let jwtService: JwtService;
    let token: string;

    @Schema()
    class UserEntity extends BaseEntity {
      @Prop({ type: String, required: true })
      email: string;

      @Prop({ type: String, required: true })
      password: string;
    }

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

  describe('useAuth with userEntity and validation options', () => {
    @Schema()
    class UserEntity extends BaseEntity {
      @Prop({ type: String, required: true })
      @IsEmail()
      email: string;

      @Prop({ type: String, required: true })
      @IsStrongPassword({
        minLength: 6,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      password: string;
    }

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

    describe('POST /register', () => {
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
        expect(body).toEqual({ accessToken: expect.any(String) });
      });
    });

    describe('POST /login', () => {
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
        expect(body).toEqual({ accessToken: expect.any(String) });
      });
    });
  });
});
