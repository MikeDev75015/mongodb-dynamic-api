import { INestApplication } from '@nestjs/common';
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
import { createRegisterUserEntity, initModule, REGISTER_ADMIN, REGISTER_USER } from '../shared';

describe('DynamicApiModule forRoot - Websockets EVENT auth-register with register options (e2e)', () => {
  const User = createRegisterUserEntity();
  type User = InstanceType<typeof User>;

  const admin = REGISTER_ADMIN;
  const user = REGISTER_USER;

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

