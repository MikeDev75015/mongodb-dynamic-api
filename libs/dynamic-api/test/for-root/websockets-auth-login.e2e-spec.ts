import { INestApplication, UnauthorizedException } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';
import { BcryptService, DynamicApiModule } from '../../src';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import {
  closeTestingApp,
  handleSocketException,
  handleSocketResponse,
  server,
} from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createLoginUserEntity, initModule, LOGIN_ADMIN, LOGIN_CLIENT, LOGIN_USER } from '../shared';

describe('DynamicApiModule forRoot - Websockets EVENT auth-login with login options (e2e)', () => {
  const User = createLoginUserEntity();
  type User = InstanceType<typeof User>;

  const admin = LOGIN_ADMIN;
  const user = LOGIN_USER;
  const client = LOGIN_CLIENT;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

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

