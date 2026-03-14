import mongoose, { Connection } from 'mongoose';
import { BcryptService, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createRegisterUserEntity, initModule, REGISTER_ADMIN, REGISTER_USER } from '../shared';

describe('DynamicApiModule forRoot - POST /auth/register with register options (e2e)', () => {
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
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
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
      expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
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

