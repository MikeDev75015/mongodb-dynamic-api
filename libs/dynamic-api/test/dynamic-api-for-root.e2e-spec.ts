import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { IsEmail, IsStrongPassword } from 'class-validator';
import mongoose, { Connection } from 'mongoose';
import { BaseEntity, BcryptService, DynamicApiForRootOptions, DynamicApiModule } from '../src';
import { SocketAdapter } from '../src/adapters/socket-adapter';
import {
  closeTestingApp,
  createTestingApp,
  handleSocketException,
  handleSocketResponse,
  server,
  TestGateway,
} from './e2e.setup';
import 'dotenv/config';
import { getModelFromEntity, wait } from './utils';

describe('DynamicApiModule forRoot (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  const initModule = async (
    dynamicApiForRootOptions: DynamicApiForRootOptions,
    initFixtures?: (connection: mongoose.Connection) => Promise<void>,
    initMainCb?: (app: INestApplication) => Promise<void>,
    testGateway?: boolean,
  ) => {
    const moduleRef = await Test.createTestingModule({
      imports: [DynamicApiModule.forRoot(uri, dynamicApiForRootOptions)],
      providers: testGateway ? [TestGateway] : [],
    }).compile();

    return createTestingApp(moduleRef, initFixtures, initMainCb);
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  it('should initialize dynamic api module state with default options', async () => {
    const app = await initModule({});

    expect(app).toBeDefined();
    expect(DynamicApiModule.state.get()).toStrictEqual({
      uri,
      initialized: true,
      isGlobalCacheEnabled: true,
      connectionName: 'dynamic-api-connection',
      cacheExcludedPaths: [],
      credentials: null,
      isAuthEnabled: false,
      jwtExpirationTime: undefined,
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
      gatewayOptions: undefined,
    });
  });

  it('should initialize dynamic api module state with custom options', async () => {
    const app = await initModule({
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
      jwtExpirationTime: undefined,
      jwtSecret: undefined,
      routesConfig: {
        defaults: ['GetMany', 'GetOne', 'CreateOne', 'UpdateOne', 'DeleteOne'],
        excluded: ['CreateMany', 'UpdateMany', 'DeleteMany'],
      },
      gatewayOptions: undefined,
    });
  });

  describe('Authentication API', () => {
    describe('useAuth when only userEntity is provided', () => {
      @Schema({ collection: 'users' })
      class UserEntity extends BaseEntity {
        @Prop({ type: String, required: true })
        email: string;

        @Prop({ type: String, required: true })
        password: string;
      }

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
          jwtExpirationTime: '1d',
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

        it('should create a new user and return access token', async () => {
          const { body, status } = await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

          expect(status).toBe(201);
          expect(body).toEqual({ accessToken: expect.any(String) });
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

        it('should return access token', async () => {
          await server.post('/auth/register', { email: 'unit@test.co', password: 'test' });

          const { body, status } = await server.post('/auth/login', { email: 'unit@test.co', password: 'test' });

          expect(status).toBe(200);
          expect(body).toEqual({ accessToken: expect.any(String) });
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
          jwtExpirationTime: '4s',
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
          expect(body).toEqual({ accessToken: expect.any(String) });
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
          expect(body).toEqual({ accessToken: expect.any(String) });
        });
      });
    });

    describe('POST /auth/register with register options', () => {
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

    describe('POST /auth/login with login options', () => {
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

          const { body, status } = await server.get(
            '/auth/account',
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );

          expect(status).toBe(200);
          expect(body).toEqual({ id: expect.any(String), username: 'admin', role: 'admin', isVerified: true });
        });
      });
    });

    describe('useAuth with resetPassword options', () => {
      @Schema({ collection: 'users' })
      class User extends BaseEntity {
        @Prop({ type: String, required: true })
        email: string;

        @Prop({ type: String, required: true })
        password: string;

        @Prop({ type: Boolean, default: false })
        isVerified: boolean;

        @Prop({ type: String })
        resetPasswordToken: string;
      }

      let model: mongoose.Model<User>;
      let user: User;
      let client: User;
      let app: INestApplication;

      beforeEach(async () => {
        user = { email: 'user@test.co', password: 'user', isVerified: true } as User;
        client = { email: 'client@test.co', password: 'client' } as User;

        const bcryptService = new BcryptService();

        const fixtures = async (_: Connection) => {
          model = await getModelFromEntity(User);
          await model.insertMany([
            { ...user, password: await bcryptService.hashPassword(user.password) },
            { ...client, password: await bcryptService.hashPassword(client.password) },
          ]);
        };

        app = await initModule({
          useAuth: {
            userEntity: User,
            resetPassword: {
              emailField: 'email',
              expirationInMinutes: 1,
              resetPasswordCallback: async (
                { resetPasswordToken }: { resetPasswordToken: string; email: string },
                { updateUserByEmail },
              ) => {
                await updateUserByEmail({ $set: { resetPasswordToken } });
              },
              changePasswordAbilityPredicate: (user: User) => user.isVerified && !!user.resetPasswordToken,
              changePasswordCallback: async (user: User, { updateOneDocument }) => {
                await updateOneDocument(User, { _id: user.id }, { $unset: { resetPasswordToken: 1 } });
              },
            },
          },
        }, fixtures);
      });

      describe('POST /auth/reset-password', () => {
        it(
          'should throw a bad request exception if email is missing if no validation options are provided',
          async () => {
            const { body, status } = await server.post('/auth/reset-password', {});

            expect(status).toBe(400);
            expect(body).toEqual({
              error: 'Bad Request',
              message: 'Invalid or missing argument',
              statusCode: 400,
            });
          }
        );

        it(
          'should not throw a bad request exception if email is invalid if no validation options are provided',
          async () => {
            const { body, status } = await server.post('/auth/reset-password', { email: 'unit.test.co' });

            expect(status).toBe(204);
            expect(body).toEqual({});
          }
        );

        it('should not throw an exception if email is not found', async () => {
          const { body, status } = await server.post('/auth/reset-password', { email: 'invalid@test.co' });

          expect(status).toBe(204);
          expect(body).toEqual({});
        });

        describe('resetPasswordCallback', () => {
          it('should set resetPasswordToken if email is valid', async () => {
            const { email } = user;
            const { resetPasswordToken: resetPasswordTokenBeforeUpdate } = (
              await model.findOne({ email }).lean().exec()
            ) as User;

            const { status } = await server.post('/auth/reset-password', { email });
            const { resetPasswordToken: resetPasswordTokenAfterUpdate } = (
              await model.findOne({ email }).lean().exec()
            ) as User;

            expect(status).toBe(204);
            expect(resetPasswordTokenBeforeUpdate).toStrictEqual(undefined);
            expect(resetPasswordTokenAfterUpdate).toStrictEqual(expect.any(String));
          });
        });
      });

      describe('PATCH /auth/change-password', () => {
        it('should throw a bad request exception if resetPasswordToken is missing', async () => {
          const { body, status } = await server.patch('/auth/change-password', { newPassword: 'test' });

          expect(status).toBe(400);
          expect(body).toEqual({
            error: 'Bad Request',
            message: 'Invalid or missing argument',
            statusCode: 400,
          });
        });

        it('should throw a bad request exception if newPassword is missing', async () => {
          const { email } = user;
          await server.post('/auth/reset-password', { email });
          const { resetPasswordToken: resetPasswordTokenAfterUpdate } = (
            await model.findOne({ email }).lean().exec()
          ) as User;

          const resetPasswordToken = resetPasswordTokenAfterUpdate;
          const { body, status } = await server.patch('/auth/change-password', { resetPasswordToken });

          expect(status).toBe(400);
          expect(body).toEqual({
            error: 'Bad Request',
            message: 'Invalid or missing argument',
            statusCode: 400,
          });
        });

        it('should throw an unauthorized exception if resetPasswordToken is invalid', async () => {
          const { body, status } = await server.patch(
            '/auth/change-password',
            { resetPasswordToken: 'test', newPassword: 'newPassword' },
          );

          expect(status).toBe(400);
          expect(body).toEqual({
            error: 'Bad Request',
            message: 'Invalid reset password token. Please redo the reset password process.',
            statusCode: 400,
          });
        });

        it('should throw an unauthorized exception if resetPasswordToken is expired', async () => {
          const jwtService = app.get<JwtService>(JwtService);
          const expiredResetPasswordToken = jwtService.sign({ email: user.email }, { expiresIn: 1 });
          await wait(500);
          const { body, status } = await server.patch(
            '/auth/change-password',
            { resetPasswordToken: expiredResetPasswordToken, newPassword: 'newPassword' },
          );

          expect(status).toBe(401);
          expect(body).toEqual({
            error: 'Unauthorized',
            message: 'Time to reset password has expired. Please redo the reset password process.',
            statusCode: 401,
          });
        });

        describe('changePasswordAbilityPredicate', () => {
          let resetPasswordToken: string;

          beforeEach(async () => {
            await server.post('/auth/reset-password', { email: client.email });

            const { resetPasswordToken: token } = (
              await model.findOne({ email: client.email }).lean().exec()
            ) as User;

            resetPasswordToken = token;
          });

          it('should throw a forbidden exception if user is not allowed to change password', async () => {
            expect(resetPasswordToken).toStrictEqual(expect.any(String));

            const { body, status } = await server.patch(
              '/auth/change-password',
              { resetPasswordToken, newPassword: 'newPassword' },
            );

            expect(status).toBe(403);
            expect(body).toEqual({
              error: 'Forbidden',
              message: 'You are not allowed to change your password.',
              statusCode: 403,
            });
          });
        });

        describe('changePasswordCallback', () => {
          let resetPasswordToken: string;

          beforeEach(async () => {
            await server.post('/auth/reset-password', { email: user.email });

            const { resetPasswordToken: token } = (
              await model.findOne({ email: user.email }).lean().exec()
            ) as User;

            resetPasswordToken = token;
          });

          it('should change password and unset resetPasswordToken if resetPasswordToken is valid', async () => {
            expect(resetPasswordToken).toStrictEqual(expect.any(String));

            const newPassword = 'newPassword';
            const bcryptService = app.get<BcryptService>(BcryptService);
            const { password: passwordBeforeUpdate } = (
              await model.findOne({ email: user.email }).lean().exec()
            ) as User;

            const { status } = await server.patch(
              '/auth/change-password',
              { resetPasswordToken, newPassword },
            );

            const { password: passwordAfterUpdate, resetPasswordToken: tokenAfterUpdate } = (
              await model.findOne({ email: user.email }).lean().exec()
            ) as User;

            const isPreviousPassword = await bcryptService.comparePassword(user.password, passwordBeforeUpdate);
            expect(isPreviousPassword).toBe(true);

            const isNewPassword = await bcryptService.comparePassword(newPassword, passwordAfterUpdate);
            expect(isNewPassword).toBe(true);

            expect(status).toBe(204);
            expect(tokenAfterUpdate).toStrictEqual(undefined);
          });
        });
      });
    });
  });

  describe('Websockets', () => {
    it('should enable websockets globally', async () => {
      await initModule(
        {
          webSocket: true,
        },
        undefined,
        async (app: INestApplication) => {
          app.useWebSocketAdapter(new SocketAdapter(app));
        },
        true,
      );

      expect(DynamicApiModule.state.get('gatewayOptions')).toStrictEqual({});

      await server.emit('test', { message: 'Hello' });

      expect(handleSocketResponse).toHaveBeenCalledTimes(1);
      expect(handleSocketResponse).toHaveBeenCalledWith({ message: 'Hello' });
      expect(handleSocketException).not.toHaveBeenCalled();
    });

    describe('Authentication EVENTS', () => {
      describe('useAuth when only userEntity is provided', () => {
        @Schema({ collection: 'users' })
        class UserEntity extends BaseEntity {
          @Prop({ type: String, required: true })
          email: string;

          @Prop({ type: String, required: true })
          password: string;
        }

        beforeEach(async () => {
          await initModule(
            {
              useAuth: {
                userEntity: UserEntity,
                webSocket: true,
              },
            },
            undefined,
            async (app: INestApplication) => {
              app.useWebSocketAdapter(new SocketAdapter(app));
            },
          );
        });

        describe('EVENT auth-register', () => {
          it('should throw a ws exception if email is missing', async () => {
            await server.emit('auth-register', { username: 'unit-test', password: 'test-2' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: ['email property is required'],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if password is missing', async () => {
            await server.emit('auth-register', { email: 'unit@test.co', pass: 'test-2' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: ['password property is required'],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should create a new user and return access token', async () => {
            await server.emit('auth-register', { email: 'unit@test.co', password: 'test' });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(handleSocketResponse).toHaveBeenCalledWith({ accessToken: expect.any(String) });
          });
        });

        describe('EVENT auth-login', () => {
          it('should throw a ws exception if email is missing', async () => {
            await server.emit('auth-login', { password: 'test-2' });

            expect(handleSocketResponse).not.toHaveBeenCalled();
            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Unauthorized',
            });
          });

          it('should throw a ws exception if password is missing', async () => {
            await server.emit('auth-login', { email: 'unit@test.co' });

            expect(handleSocketResponse).not.toHaveBeenCalled();
            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Unauthorized',
            });
          });

          it('should return access token', async () => {
            await server.emit('auth-register', { email: 'unit@test.co', password: 'test' });

            await server.emit('auth-login', { email: 'unit@test.co', password: 'test' });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(2);
            expect(handleSocketResponse).toHaveBeenNthCalledWith(2, { accessToken: expect.any(String) });
          });
        });

        describe('EVENT auth-get-account', () => {
          it('should throw a ws exception if access token is missing', async () => {
            await server.emit('auth-get-account');

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Unauthorized',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should return user account', async () => {
            const { accessToken } = await server.emit(
              'auth-register',
              { email: 'unit@test.co', password: 'test' },
            );
            await server.emit('auth-get-account', undefined, { accessToken });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(2);
            expect(handleSocketResponse).toHaveBeenNthCalledWith(1, { accessToken: expect.any(String) });
            expect(handleSocketResponse).toHaveBeenNthCalledWith(
              2,
              { email: 'unit@test.co', id: expect.any(String) },
            );
          });
        });

        it(
          'should throw a ws exception when receiving reset password event if reset password options are not configured',
          async () => {
            await server.emit('auth-reset-password', { email: 'toto@test.co' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'This feature is not available',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          },
        );

        it(
          'should throw a ws exception when receiving change password event if reset password options are not configured',
          async () => {
            await server.emit('auth-change-password', { newPassword: 'test' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'This feature is not available',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          },
        );
      });

      describe('useAuth with jwt options', () => {
        let jwtService: JwtService;
        let accessToken: string;
        let app: INestApplication;

        @Schema({ collection: 'users' })
        class UserEntity extends BaseEntity {
          @Prop({ type: String, required: true })
          email: string;

          @Prop({ type: String, required: true })
          password: string;
        }

        beforeEach(async () => {
          app = await initModule(
            {
              useAuth: {
                userEntity: UserEntity,
                webSocket: true,
                jwt: {
                  secret: 'test-secret',
                  expiresIn: '3s',
                },
              },
            },
            undefined,
            async (_: INestApplication) => {
              _.useWebSocketAdapter(new SocketAdapter(_));
            },
          );

          jwtService = app.get<JwtService>(JwtService);

          const { accessToken: token } = await server.emit(
            'auth-register',
            { email: 'unit@test.co', password: 'test' },
          );
          accessToken = token;
        });

        it('should initialize state and authentication EVENTS with jwt options', async () => {
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
            jwtExpirationTime: '3s',
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

        it('should throw a ws exception if access token is expired', async () => {
          handleSocketResponse.mockReset();
          await wait(4000);

          await server.emit('auth-get-account', undefined, { accessToken });

          expect(handleSocketException).toHaveBeenCalledTimes(1);
          expect(handleSocketException).toHaveBeenCalledWith({
            message: 'Unauthorized',
          });
          expect(handleSocketResponse).not.toHaveBeenCalled();
        });

        it('should throw a ws exception if secret is invalid', async () => {
          handleSocketResponse.mockReset();
          const invalidToken = jwtService.sign({ email: 'u', password: 'p' }, { secret: 'invalid-secret' });
          await server.emit('auth-get-account', undefined, { accessToken: invalidToken });

          expect(handleSocketException).toHaveBeenCalledTimes(1);
          expect(handleSocketException).toHaveBeenCalledWith({
            message: 'Unauthorized',
          });
          expect(handleSocketResponse).not.toHaveBeenCalled();
        });
      });

      describe('useAuth with validation options', () => {
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
          await initModule(
            {
            useAuth: {
              userEntity: UserEntity,
              validationPipeOptions: {
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
              },
            },
              webSocket: true,
          },
            undefined,
            async (_: INestApplication) => {
              _.useWebSocketAdapter(new SocketAdapter(_));
            },
          );

          handleSocketResponse.mockReset();
        });

        describe('EVENT auth-register', () => {
          it('should throw a ws exception if payload contains non whitelisted property', async () => {
            await server.emit(
              'auth-register',
              { email: 'unit@test.co', password: 'Test-2', role: 'ADMIN' },
            );

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: ['property role should not exist'],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if validation fails', async () => {
            await server.emit('auth-register', { email: 'unit.test.co', password: 'test-2' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: [
                'email must be an email',
                'password is not strong enough',
              ],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should create a new user and emit access token if the validation was successful', async () => {
            await server.emit('auth-register', { email: 'unit@test.co', password: 'Test-2' });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(handleSocketResponse).toHaveBeenCalledWith({
              accessToken: expect.any(String),
            });
          });
        });

        describe('EVENT auth-login', () => {
          beforeEach(async () => {
            await server.emit('auth-register', { email: 'unit@test.co', password: 'Test-2' });

            handleSocketResponse.mockReset();
          });

          it('should throw a ws exception if payload contains non whitelisted property', async () => {
            await server.emit(
              'auth-login',
              { email: 'unit@test.co', password: 'Test-2', role: 'ADMIN' },
            );

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: ['property role should not exist'],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if email is missing', async () => {
            await server.emit('auth-login', { password: 'Test-2' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: ['email must be an email'],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if password is missing', async () => {
            await server.emit('auth-login', { email: 'unit@test.co' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: ['password is not strong enough'],
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should emit access token if the validation was successful', async () => {
            await server.emit('auth-login', { email: 'unit@test.co', password: 'Test-2' });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(handleSocketResponse).toHaveBeenCalledWith({
              accessToken: expect.any(String),
            });
          });
        });
      });

      describe('EVENT auth-register with register options', () => {
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

          await initModule(
            {
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
              webSocket: true,
            }, fixtures,
            async (_: INestApplication) => {
              _.useWebSocketAdapter(new SocketAdapter(_));
            },
          );
        });

        describe('protected', () => {
          it('should throw a ws exception if user is not logged in and protected is true', async () => {
            await server.emit('auth-register', { email: 'unit@test.co', password: 'test' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Unauthorized',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });
        });

        describe('abilityPredicate', () => {
          it('should not create a new user if user is not verified', async () => {
            const { email, password } = user;
            const { accessToken } = await server.emit('auth-login', { email, password });
            handleSocketResponse.mockReset();

            await server.emit('auth-register', { email: 'unit@test.co', password: 'test' }, {
              accessToken,
            });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Access denied',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should create a new user and return access token if user is verified', async () => {
            const { email, password } = admin;
            const { accessToken } = await server.emit('auth-login', { email, password });
            handleSocketResponse.mockReset();

            await server.emit('auth-register', { email: 'unit@test.co', password: 'test' }, {
              accessToken,
            });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(handleSocketResponse).toHaveBeenCalledWith({ accessToken: expect.any(String) });
          });
        });

        describe('additionalFields', () => {
          it('should allow to register a new user with additional fields', async () => {
            const { email, password } = admin;
            const { accessToken } = await server.emit('auth-login', { email, password });
            handleSocketResponse.mockReset();

            await server.emit(
              'auth-register',
              { email: 'client@test.co', password: 'client', role: 'client' },
              {
                accessToken,
              },
            );

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(handleSocketResponse).toHaveBeenCalledWith({ accessToken: expect.any(String) });
          });
        });

        describe('callback', () => {
          let adminAccessToken: string;

          beforeEach(async () => {
            const { email, password } = admin;
            const { accessToken } = await server.emit('auth-login', { email, password });
            adminAccessToken = accessToken;
            handleSocketResponse.mockReset();
          });

          it('should not set isVerified to true if role is not admin', async () => {
            const { accessToken: clientAccessToken } = await server.emit(
              'auth-register',
              { email: 'client@test.co', password: 'client', role: 'client' },
              {
                accessToken: adminAccessToken,
              },
            );
            handleSocketResponse.mockReset();

            const body = await server.emit(
              'auth-get-account',
              undefined,
              { accessToken: clientAccessToken },
            );

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(body).toHaveProperty('isVerified', false);
          });

          it('should set isVerified to true if role is admin', async () => {
            const { accessToken: admin2AccessToken } = await server.emit(
              'auth-register',
              { email: 'admin2@test.co', password: 'admin2', role: 'admin' },
              {
                accessToken: adminAccessToken,
              },
            );
            handleSocketResponse.mockReset();

            const body = await server.emit(
              'auth-get-account',
              undefined,
              { accessToken: admin2AccessToken },
            );

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(body).toHaveProperty('isVerified', true);
          });
        });
      });

      describe('EVENT auth-login with login options', () => {
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

          await initModule(
            {
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
            webSocket: true,
          }, fixtures,
            async (_: INestApplication) => {
              _.useWebSocketAdapter(new SocketAdapter(_));
            },
          );
        });

        describe('loginField', () => {
          it('should throw a ws exception if loginField is missing', async () => {
            await server.emit('auth-login', { pass: 'test' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Unauthorized',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });
        });

        describe('passwordField', () => {
          it('should throw an unauthorized exception if passwordField is missing', async () => {
            await server.emit('auth-login', { username: 'unit' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Unauthorized',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });
        });

        describe('abilityPredicate', () => {
          it('should throw a ws exception if user role is not admin or user', async () => {
            const { username, pass } = client;
            await server.emit('auth-login', { username, pass });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Access denied',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });
        });

        describe('callback', () => {
          it('should throw a ws exception if user is not verified', async () => {
            const { username, pass } = user;
            await server.emit('auth-login', { username, pass });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Hello user, you must verify your account first!',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });
        });

        describe('additionalFields', () => {
          it('should return additional fields', async () => {
            const { username, pass } = admin;
            const { accessToken } = await server.emit('auth-login', { username, pass });
            handleSocketResponse.mockReset();

            await server.emit(
              'auth-get-account',
              undefined,
              { accessToken },
            );

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            expect(handleSocketResponse).toHaveBeenCalledWith(
              { id: expect.any(String), username: 'admin', role: 'admin', isVerified: true },
            );
          });
        });
      });

      describe('useAuth with resetPassword options', () => {
        @Schema({ collection: 'users' })
        class User extends BaseEntity {
          @Prop({ type: String, required: true })
          email: string;

          @Prop({ type: String, required: true })
          password: string;

          @Prop({ type: Boolean, default: false })
          isVerified: boolean;

          @Prop({ type: String })
          resetPasswordToken: string;
        }

        let model: mongoose.Model<User>;
        let user: User;
        let client: User;
        let app: INestApplication;

        beforeEach(async () => {
          user = { email: 'user@test.co', password: 'user', isVerified: true } as User;
          client = { email: 'client@test.co', password: 'client' } as User;

          const bcryptService = new BcryptService();

          const fixtures = async (_: Connection) => {
            model = await getModelFromEntity(User);
            await model.insertMany([
              { ...user, password: await bcryptService.hashPassword(user.password) },
              { ...client, password: await bcryptService.hashPassword(client.password) },
            ]);
          };

          app = await initModule(
            {
            useAuth: {
              userEntity: User,
              resetPassword: {
                emailField: 'email',
                expirationInMinutes: 1,
                resetPasswordCallback: async (
                  { resetPasswordToken }: { resetPasswordToken: string; email: string },
                  { updateUserByEmail },
                ) => {
                  await updateUserByEmail({ $set: { resetPasswordToken } });
                },
                changePasswordAbilityPredicate: (user: User) => user.isVerified && !!user.resetPasswordToken,
                changePasswordCallback: async (user: User, { updateOneDocument }) => {
                  await updateOneDocument(User, { _id: user.id }, { $unset: { resetPasswordToken: 1 } });
                },
              },
            },
            webSocket: true,
          }, fixtures,
            async (_: INestApplication) => {
              _.useWebSocketAdapter(new SocketAdapter(_));
            },
          );
        });

        describe('EVENT auth-reset-password', () => {
          it(
            'should throw a ws exception if email is missing if no validation options are provided',
            async () => {
              await server.emit('auth-reset-password', {});

              expect(handleSocketException).toHaveBeenCalledTimes(1);
              expect(handleSocketException).toHaveBeenCalledWith({
                message: 'Invalid or missing argument',
              });
              expect(handleSocketResponse).not.toHaveBeenCalled();
            }
          );

          it(
            'should not throw a ws exception if email is invalid if no validation options are provided',
            async () => {
              await server.emit('auth-reset-password', { email: 'unit.test.co' });

              expect(handleSocketException).not.toHaveBeenCalled();
              expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            }
          );

          it('should not throw a ws exception if email is not found', async () => {
            await server.emit('auth-reset-password', { email: 'invalid@test.co' });

            expect(handleSocketException).not.toHaveBeenCalled();
            expect(handleSocketResponse).toHaveBeenCalledTimes(1);
          });

          describe('resetPasswordCallback', () => {
            it('should set resetPasswordToken if email is valid', async () => {
              const { email } = user;
              const { resetPasswordToken: resetPasswordTokenBeforeUpdate } = (
                await model.findOne({ email }).lean().exec()
              ) as User;

              await server.emit('auth-reset-password', { email });

              const { resetPasswordToken: resetPasswordTokenAfterUpdate } = (
                await model.findOne({ email }).lean().exec()
              ) as User;


              expect(handleSocketException).not.toHaveBeenCalled();
              expect(handleSocketResponse).toHaveBeenCalledTimes(1);
              expect(resetPasswordTokenBeforeUpdate).toStrictEqual(undefined);
              expect(resetPasswordTokenAfterUpdate).toStrictEqual(expect.any(String));
            });
          });
        });

        describe('EVENT auth-change-password', () => {
          it('should throw a ws exception if resetPasswordToken is missing', async () => {
            await server.emit('auth-change-password', { newPassword: 'test' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Invalid or missing argument',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if newPassword is missing', async () => {
            await server.emit('auth-change-password', { resetPasswordToken: 'resetPasswordToken' });

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Invalid or missing argument',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if resetPasswordToken is invalid', async () => {
            await server.emit(
              'auth-change-password',
              { resetPasswordToken: 'test', newPassword: 'newPassword' },
            );

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Invalid reset password token. Please redo the reset password process.',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          it('should throw a ws exception if resetPasswordToken is expired', async () => {
            const jwtService = app.get<JwtService>(JwtService);
            const expiredResetPasswordToken = jwtService.sign({ email: user.email }, { expiresIn: 1 });
            await wait(500);

            await server.emit(
              'auth-change-password',
              { resetPasswordToken: expiredResetPasswordToken, newPassword: 'newPassword' },
            );

            expect(handleSocketException).toHaveBeenCalledTimes(1);
            expect(handleSocketException).toHaveBeenCalledWith({
              message: 'Time to reset password has expired. Please redo the reset password process.',
            });
            expect(handleSocketResponse).not.toHaveBeenCalled();
          });

          describe('changePasswordAbilityPredicate', () => {
            let resetPasswordToken: string;

            beforeEach(async () => {
              await server.emit('auth-reset-password', { email: client.email });
              handleSocketResponse.mockReset();

              const { resetPasswordToken: token } = (
                await model.findOne({ email: client.email }).lean().exec()
              ) as User;

              resetPasswordToken = token;
            });

            it('should throw a ws exception if user is not allowed to change password', async () => {
              await server.emit(
                'auth-change-password',
                { resetPasswordToken, newPassword: 'newPassword' },
              );

              expect(handleSocketException).toHaveBeenCalledTimes(1);
              expect(handleSocketException).toHaveBeenCalledWith({
                message: 'You are not allowed to change your password.',
              });
              expect(handleSocketResponse).not.toHaveBeenCalled();
            });
          });

          describe('changePasswordCallback', () => {
            let resetPasswordToken: string;

            beforeEach(async () => {
              await server.emit('auth-reset-password', { email: user.email });
              handleSocketResponse.mockReset();

              const { resetPasswordToken: token } = (
                await model.findOne({ email: user.email }).lean().exec()
              ) as User;

              resetPasswordToken = token;
            });

            it('should change password and unset resetPasswordToken if resetPasswordToken is valid', async () => {
              const newPassword = 'newPassword';
              const bcryptService = app.get<BcryptService>(BcryptService);
              const { password: passwordBeforeUpdate } = (
                await model.findOne({ email: user.email }).lean().exec()
              ) as User;

              await server.emit(
                'auth-change-password',
                { resetPasswordToken, newPassword },
              );

              const { password: passwordAfterUpdate, resetPasswordToken: tokenAfterUpdate } = (
                await model.findOne({ email: user.email }).lean().exec()
              ) as User;

              const isPreviousPassword = await bcryptService.comparePassword(user.password, passwordBeforeUpdate);
              expect(isPreviousPassword).toBe(true);

              const isNewPassword = await bcryptService.comparePassword(newPassword, passwordAfterUpdate);
              expect(isNewPassword).toBe(true);

              expect(tokenAfterUpdate).toStrictEqual(undefined);

              expect(handleSocketException).not.toHaveBeenCalled();
              expect(handleSocketResponse).toHaveBeenCalledTimes(1);
            });
          });
        });
      });
    });
  });
});
