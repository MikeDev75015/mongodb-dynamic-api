import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { IsEmail, IsStrongPassword } from 'class-validator';
import mongoose, { Connection } from 'mongoose';
import { BaseEntity, BcryptService, DynamicApiForRootOptions, DynamicApiModule } from '../src';
import { closeTestingApp, createTestingApp, server } from './e2e.setup';
import 'dotenv/config';
import { getModelFromEntity, wait } from './utils';

describe('DynamicApiModule forRoot (e2e)', () => {
  let app: INestApplication;
  const uri = process.env.MONGO_DB_URL;

  const initModule = async (
    dynamicApiForRootOptions: DynamicApiForRootOptions,
    initFixtures?: (connection: mongoose.Connection) => Promise<void>,
  ) => {
    const moduleRef = await Test.createTestingModule({
      imports: [DynamicApiModule.forRoot(uri, dynamicApiForRootOptions)],
    }).compile();

    return createTestingApp(moduleRef, initFixtures);
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
    @Schema({ collection: 'users' })
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

    @Schema({ collection: 'users' })
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
    @Schema({ collection: 'users' })
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

  describe('POST /register with register options', () => {
    @Schema({ collection: 'users' })
    class User extends BaseEntity {
      @Prop({ type: String, required: true })
      email: string;

      @Prop({ type: String, required: true })
      password: string;

      @Prop({ type: String, default: 'user' })
      role: 'admin' | 'user' | 'client' = 'user';

      @Prop({ type: Boolean, default: false })
      isVerified: boolean;
    }

    const admin = { email: 'admin@test.co', password: 'admin', role: 'admin', isVerified: true };
    const user = { email: 'user@test.co', password: 'user' };

    beforeEach(async () => {
      const bcryptService = new BcryptService();

      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(User);
        await model.insertMany([
          { ...admin, password: await bcryptService.hashPassword(admin.password) },
          { ...user, password: await bcryptService.hashPassword(user.password) },
        ]);
      };

      await initModule({
        useAuth: {
          userEntity: User,
          register: {
            protected: true,
            abilityPredicate: (user: User) => user.isVerified,
            additionalFields: ['role'],
            callback: async (user: User, { updateOneDocument }) => {
              if (user.role !== 'admin') {
                return;
              }

              await updateOneDocument(User, { _id: user.id }, { $set: { isVerified: true } });
            },
          },
          login: {
            additionalFields: ['role', 'isVerified'],
          },
        },
      }, fixtures);
    });

    describe('protected', () => {
      it('should throw an unauthorized exception if user is not logged in and protected is true', async () => {
        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });
    });

    describe('abilityPredicate', () => {
      it('should not create a new user if user is not verified', async () => {
        const { email, password } = user;
        const { body: { accessToken } } = await server.post('/auth/login', { email, password });

        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'test' }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        expect(status).toBe(403);
        expect(body).toEqual({
          error: 'Forbidden',
          message: 'Access denied',
          statusCode: 403,
        });
      });

      it('should create a new user and return access token if user is verified', async () => {
        const { email, password } = admin;
        const { body: { accessToken } } = await server.post('/auth/login', { email, password });

        const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'test' }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        expect(status).toBe(201);
        expect(body).toEqual({ accessToken: expect.any(String) });
      });
    });

    describe('additionalFields', () => {
      it('should allow to register a new user with additional fields', async () => {
        const { email, password } = admin;
        const { body: { accessToken } } = await server.post('/auth/login', { email, password });

        const { body, status } = await server.post(
          '/auth/register',
          { email: 'client@test.co', password: 'client', role: 'client' },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        expect(status).toBe(201);
        expect(body).toEqual({ accessToken: expect.any(String) });
      });
    });

    describe('callback', () => {
      it('should not set isVerified to true if role is not admin', async () => {
        const { email, password } = admin;
        const { body: loginBody } = await server.post('/auth/login', { email, password });

        const { body: { accessToken } } = await server.post(
          '/auth/register',
          { email: 'client@test.co', password: 'client', role: 'client' },
          {
            headers: { Authorization: `Bearer ${loginBody.accessToken}` },
          },
        );

        const { body, status } = await server.get(
          '/auth/account',
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        expect(status).toBe(200);
        expect(body).toHaveProperty('isVerified', false);
      });

      it('should set isVerified to true if role is admin', async () => {
        const { email, password } = admin;
        const { body: loginBody } = await server.post('/auth/login', { email, password });

        const { body: { accessToken } } = await server.post(
          '/auth/register',
          { email: 'admin2@test.co', password: 'admin2', role: 'admin' },
          {
            headers: { Authorization: `Bearer ${loginBody.accessToken}` },
          },
        );

        const { body, status } = await server.get(
          '/auth/account',
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        expect(status).toBe(200);
        expect(body).toHaveProperty('isVerified', true);
      });
    });
  });

  describe('POST /login with login options', () => {
    @Schema({ collection: 'users' })
    class User extends BaseEntity {
      @Prop({ type: String, required: true })
      username: string;

      @Prop({ type: String, required: true })
      pass: string;

      @Prop({ type: String, default: 'user' })
      role: 'admin' | 'user' | 'client' = 'user';

      @Prop({ type: Boolean, default: false })
      isVerified: boolean;
    }

    const admin = { username: 'admin', pass: 'admin', role: 'admin', isVerified: true };
    const user = { username: 'user', pass: 'user' };
    const client = { username: 'client', pass: 'client', role: 'client', isVerified: true };

    beforeEach(async () => {
      const bcryptService = new BcryptService();

      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(User);
        await model.insertMany([
          { ...admin, pass: await bcryptService.hashPassword(admin.pass) },
          { ...user, pass: await bcryptService.hashPassword(user.pass) },
          { ...client, pass: await bcryptService.hashPassword(client.pass) },
        ]);
      };

      await initModule({
        useAuth: {
          userEntity: User,
          login: {
            loginField: 'username',
            passwordField: 'pass',
            additionalFields: ['role', 'isVerified'],
            abilityPredicate: (user: User) => user.role === 'admin' || user.role === 'user',
            callback: async (user: User) => {
              if (user.isVerified) {
                return;
              }

              throw new UnauthorizedException(`Hello ${user.username}, you must verify your account first!`);
            },
          },
        },
      }, fixtures);
    });

    describe('loginField', () => {
      it('should throw an unauthorized exception if loginField is missing', async () => {
        const { body, status } = await server.post('/auth/login', { pass: 'test' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });
    });

    describe('passwordField', () => {
      it('should throw an unauthorized exception if passwordField is missing', async () => {
        const { body, status } = await server.post('/auth/login', { username: 'unit' });

        expect(status).toBe(401);
        expect(body).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      });
    });

    describe('abilityPredicate', () => {
      it('should throw an forbidden exception if user role is not admin or user', async () => {
        const { username, pass } = client;
        const { body, status } = await server.post('/auth/login', { username, pass });

        expect(status).toBe(403);
        expect(body).toEqual({
          error: 'Forbidden',
          message: 'Access denied',
          statusCode: 403,
        });
      });
    });

    describe('callback', () => {
      it('should throw an unauthorized exception if user is not verified', async () => {
        const { username, pass } = user;
        const { body, status } = await server.post('/auth/login', { username, pass });

        expect(status).toBe(401);
        expect(body).toEqual({
          error: 'Unauthorized',
          message: `Hello ${username}, you must verify your account first!`,
          statusCode: 401,
        });
      });
    });

    describe('additionalFields', () => {
      it('should return additional fields', async () => {
        const { username, pass } = admin;
        const { body: { accessToken } } = await server.post('/auth/login', { username, pass });

        const { body, status } = await server.get('/auth/account', { headers: { Authorization: `Bearer ${accessToken}` } });

        expect(status).toBe(200);
        expect(body).toEqual({ id: expect.any(String), username: 'admin', role: 'admin', isVerified: true });
      });
    });
  });
});
