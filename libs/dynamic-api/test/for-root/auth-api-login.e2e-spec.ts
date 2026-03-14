import { UnauthorizedException } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';
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

