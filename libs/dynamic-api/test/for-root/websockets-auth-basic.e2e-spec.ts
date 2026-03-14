import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import {
  closeTestingApp,
  handleSocketException,
  handleSocketResponse,
  server,
} from '../e2e.setup';
import 'dotenv/config';
import { wait } from '../utils';
import { createBasicUserEntity, createValidatedUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - Websockets Authentication Basic (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

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
      let app: INestApplication;

      beforeEach(async () => {
        app = await initModule(
          {
            useAuth: {
              userEntity: createBasicUserEntity(),
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
          expect(handleSocketResponse).toHaveBeenCalledWith({ accessToken: expect.any(String), refreshToken: expect.any(String) });
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
          expect(handleSocketResponse).toHaveBeenNthCalledWith(2, { accessToken: expect.any(String), refreshToken: expect.any(String) });
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
          expect(handleSocketResponse).toHaveBeenNthCalledWith(1, { accessToken: expect.any(String), refreshToken: expect.any(String) });
          expect(handleSocketResponse).toHaveBeenNthCalledWith(
            2,
            { email: 'unit@test.co', id: expect.any(String) },
          );
        });
      });

      describe('EVENT auth-refresh-token', () => {
        it('should throw a ws exception if refresh token is missing', async () => {
          await server.emit('auth-refresh-token');

          expect(handleSocketException).toHaveBeenCalledTimes(1);
          expect(handleSocketException).toHaveBeenCalledWith({ message: 'Unauthorized' });
          expect(handleSocketResponse).not.toHaveBeenCalled();
        });

        it('should return new tokens using refresh token', async () => {
          const { refreshToken } = await server.emit('auth-register', { email: 'unit@test.co', password: 'test' });
          handleSocketResponse.mockReset();

          await server.emit('auth-refresh-token', undefined, { refreshToken });

          expect(handleSocketException).not.toHaveBeenCalled();
          expect(handleSocketResponse).toHaveBeenCalledTimes(1);
          expect(handleSocketResponse).toHaveBeenCalledWith({ accessToken: expect.any(String), refreshToken: expect.any(String) });
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

      beforeEach(async () => {
        app = await initModule(
          {
            useAuth: {
              userEntity: createBasicUserEntity(),
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
      let app: INestApplication;

      beforeEach(async () => {
        app = await initModule(
          {
            useAuth: {
              userEntity: createValidatedUserEntity(),
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
            refreshToken: expect.any(String),
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
            refreshToken: expect.any(String),
          });
        });
      });
    });
  });
});

