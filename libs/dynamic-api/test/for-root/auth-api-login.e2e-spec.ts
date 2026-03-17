import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import mongoose, { Connection } from 'mongoose';
import { Strategy } from 'passport-local';
import { BcryptService, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createLoginUserEntity, initModule, LOGIN_ADMIN, LOGIN_CLIENT, LOGIN_USER } from '../shared';

describe('DynamicApiModule forRoot - POST /auth/login with login options (e2e)', () => {
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

  describe('login alias', () => {
    it('should login successfully when using "login" alias instead of the configured loginField', async () => {
      const { username, pass } = admin;
      const { body, status } = await server.post('/auth/login', { login: username, pass });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
    });

    it('should not overwrite the configured loginField when both loginField and "login" alias are provided', async () => {
      const { username, pass } = admin;
      const { body, status } = await server.post('/auth/login', { username, login: 'wrong@test.com', pass });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
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

describe('DynamicApiModule forRoot - POST /auth/login with customValidate (e2e)', () => {
  const User = createLoginUserEntity();
  type User = InstanceType<typeof User>;

  const admin = LOGIN_ADMIN;
  const user = LOGIN_USER;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('when customValidate returns a user', () => {
    beforeEach(async () => {
      const bcryptService = new BcryptService();

      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(User);
        await model.insertMany([
          { ...admin, pass: await bcryptService.hashPassword(admin.pass) },
          { ...user, pass: await bcryptService.hashPassword(user.pass) },
        ]);
      };

      await initModule({
        useAuth: {
          userEntity: User,
          login: {
            loginField: 'username',
            passwordField: 'pass',
            additionalFields: ['role', 'isVerified'],
            customValidate: async (req) => {
              const deviceToken = req.body?.deviceToken;
              if (!deviceToken) {
                return null;
              }

              // Simulate device-token lookup: if the token matches, return a fake user
              if (deviceToken === 'valid-device-token') {
                return {
                  id: 'device-user-id',
                  username: 'device-user',
                  role: 'admin',
                  isVerified: true,
                } as any;
              }

              return null;
            },
          },
        },
      }, fixtures);
    });

    it('should login via customValidate without password check when device token is valid', async () => {
      const { body, status } = await server.post('/auth/login', {
        username: 'any',
        pass: 'any',
        deviceToken: 'valid-device-token',
      });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
    });

    it('should login via customValidate even when username and password are missing from request body', async () => {
      const { body, status } = await server.post('/auth/login', {
        deviceToken: 'valid-device-token',
      });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
    });

    it('should login via customValidate when password is empty', async () => {
      const { body, status } = await server.post('/auth/login', {
        username: 'any',
        pass: '',
        deviceToken: 'valid-device-token',
      });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
    });

    it('should fall back to normal password validation when customValidate returns null', async () => {
      const { username, pass } = admin;
      const { body, status } = await server.post('/auth/login', { username, pass });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
    });

    it('should return 401 when customValidate returns null and password is wrong', async () => {
      const { body, status } = await server.post('/auth/login', {
        username: admin.username,
        pass: 'wrong-password',
      });

      expect(status).toBe(401);
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Invalid credentials',
        statusCode: 401,
      });
    });
  });

  describe('when customValidate is combined with abilityPredicate', () => {
    beforeEach(async () => {
      const bcryptService = new BcryptService();

      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(User);
        await model.insertMany([
          { ...admin, pass: await bcryptService.hashPassword(admin.pass) },
        ]);
      };

      await initModule({
        useAuth: {
          userEntity: User,
          login: {
            loginField: 'username',
            passwordField: 'pass',
            abilityPredicate: (u: User) => u.role === 'admin',
            customValidate: async (req) => {
              const deviceToken = req.body?.deviceToken;
              if (deviceToken === 'client-device') {
                return {
                  id: 'client-id',
                  username: 'client-device-user',
                  role: 'client',
                  isVerified: true,
                } as any;
              }
              return null;
            },
          },
        },
      }, fixtures);
    });

    it('should return 403 when customValidate user is rejected by abilityPredicate', async () => {
      const { body, status } = await server.post('/auth/login', {
        username: 'any',
        pass: 'any',
        deviceToken: 'client-device',
      });

      expect(status).toBe(403);
      expect(body).toEqual({
        error: 'Forbidden',
        message: 'Access denied',
        statusCode: 403,
      });
    });
  });
});

describe('DynamicApiModule forRoot - POST /auth/login with useStrategy (e2e)', () => {
  const User = createLoginUserEntity();
  type User = InstanceType<typeof User>;

  const admin = LOGIN_ADMIN;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('when a custom Passport strategy is provided', () => {
    beforeEach(async () => {
      const bcryptService = new BcryptService();

      const fixtures = async (_: Connection) => {
        const model = await getModelFromEntity(User);
        await model.insertMany([
          { ...admin, pass: await bcryptService.hashPassword(admin.pass) },
        ]);
      };

      @Injectable()
      class CustomLocalStrategy extends PassportStrategy(Strategy, 'local') {
        constructor(
          @Inject('DynamicApiAuthService')
          private readonly authService: any,
        ) {
          super({ usernameField: 'username', passwordField: 'pass' });
        }

        async validate(username: string, pass: string): Promise<any> {
          const user = await this.authService.validateUser(username, pass);
          if (!user) {
            throw new UnauthorizedException('Custom strategy: invalid credentials');
          }

          if (user.role !== 'admin') {
            throw new ForbiddenException('Custom strategy: admins only');
          }

          return user;
        }
      }

      await initModule({
        useAuth: {
          userEntity: User,
          login: {
            loginField: 'username',
            passwordField: 'pass',
            additionalFields: ['role', 'isVerified'],
            useStrategy: CustomLocalStrategy,
          },
        },
      }, fixtures);
    });

    it('should login successfully using the custom strategy', async () => {
      const { username, pass } = admin;
      const { body, status } = await server.post('/auth/login', { username, pass });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
    });

    it('should return 401 when custom strategy rejects credentials', async () => {
      const { body, status } = await server.post('/auth/login', {
        username: 'unknown',
        pass: 'wrong',
      });

      expect(status).toBe(401);
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Custom strategy: invalid credentials',
        statusCode: 401,
      });
    });
  });
});

describe('DynamicApiModule forRoot - POST /auth/login with two users each retrieves own account (e2e)', () => {
  const User = createLoginUserEntity();
  type User = InstanceType<typeof User>;

  const userA = { username: 'alice', pass: 'alice-pass', role: 'admin' as const, isVerified: true };
  const userB = { username: 'bob', pass: 'bob-pass', role: 'user' as const, isVerified: true };

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
        { ...userA, pass: await bcryptService.hashPassword(userA.pass) },
        { ...userB, pass: await bcryptService.hashPassword(userB.pass) },
      ]);
    };

    await initModule({
      useAuth: {
        userEntity: User,
        login: {
          loginField: 'username',
          passwordField: 'pass',
          additionalFields: ['role', 'isVerified'],
        },
      },
    }, fixtures);
  });

  it('should return each user their own account when two users login', async () => {
    // Login user A
    const { body: bodyA, status: statusA } = await server.post('/auth/login', {
      username: userA.username,
      pass: userA.pass,
    });
    expect(statusA).toBe(200);
    expect(bodyA).toHaveProperty('accessToken');

    // Login user B
    const { body: bodyB, status: statusB } = await server.post('/auth/login', {
      username: userB.username,
      pass: userB.pass,
    });
    expect(statusB).toBe(200);
    expect(bodyB).toHaveProperty('accessToken');

    // Fetch account for user A
    const { body: accountA, status: accountStatusA } = await server.get(
      '/auth/account',
      { headers: { Authorization: `Bearer ${bodyA.accessToken}` } },
    );
    expect(accountStatusA).toBe(200);
    expect(accountA).toEqual({
      id: expect.any(String),
      username: 'alice',
      role: 'admin',
      isVerified: true,
    });

    // Fetch account for user B
    const { body: accountB, status: accountStatusB } = await server.get(
      '/auth/account',
      { headers: { Authorization: `Bearer ${bodyB.accessToken}` } },
    );
    expect(accountStatusB).toBe(200);
    expect(accountB).toEqual({
      id: expect.any(String),
      username: 'bob',
      role: 'user',
      isVerified: true,
    });

    // Ensure both accounts are distinct
    expect(accountA.id).not.toEqual(accountB.id);
    expect(accountA.username).not.toEqual(accountB.username);
  });
});

