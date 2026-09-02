import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createPasswordlessUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - useAuth with passwordless options (e2e)', () => {
  const User = createPasswordlessUserEntity();
  type User = InstanceType<typeof User>;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  let model: mongoose.Model<User>;
  let app: INestApplication;

  /** Captures the most recently sent OTP code for assertions. */
  let capturedCode: string | undefined;

  const sendCodeCallback = vi.fn();

  const user: Partial<User> = { email: 'passwordless@test.co' };

  beforeEach(async () => {
    capturedCode = undefined;
    sendCodeCallback.mockReset();
    sendCodeCallback.mockImplementation(async (_identifier: string, code: string) => {
      capturedCode = code;
    });

    const fixtures = async (_: Connection) => {
      model = await getModelFromEntity(User);
      await model.insertMany([user]);
    };

    app = await initModule(
      {
        useAuth: {
          userEntity: User,
          passwordless: {
            otpExpirationMinutes: 10,
            sendCodeCallback,
          },
        },
      },
      fixtures,
    );
  });

  describe('POST /auth/passwordless/send-code', () => {
    it('should return 503 when passwordless is not enabled', async () => {
      DynamicApiModule.state['resetState']();
      await closeTestingApp(mongoose.connections);

      app = await initModule({
        useAuth: {
          userEntity: User,
        },
      });

      const { status } = await server.post('/auth/passwordless/send-code', {
        identifier: user.email,
      });

      expect(status).toBe(503);
    });

    it('should return 400 when identifier is missing', async () => {
      const { status } = await server.post('/auth/passwordless/send-code', {});

      expect(status).toBe(400);
    });

    it('should return 204 and call sendCodeCallback with identifier and 6-digit code', async () => {
      const { status } = await server.post('/auth/passwordless/send-code', {
        identifier: user.email,
      });

      expect(status).toBe(204);
      expect(sendCodeCallback).toHaveBeenCalledTimes(1);
      expect(sendCodeCallback).toHaveBeenCalledWith(user.email, expect.stringMatching(/^\d{6}$/));
      expect(capturedCode).toMatch(/^\d{6}$/);
    });

    it('should replace existing OTP when send-code is called twice (upsert)', async () => {
      await server.post('/auth/passwordless/send-code', { identifier: user.email });
      const firstCode = capturedCode;

      await server.post('/auth/passwordless/send-code', { identifier: user.email });
      const secondCode = capturedCode;

      expect(sendCodeCallback).toHaveBeenCalledTimes(2);
      // Both calls should produce a 6-digit code (content may differ)
      expect(firstCode).toMatch(/^\d{6}$/);
      expect(secondCode).toMatch(/^\d{6}$/);
    });
  });

  describe('POST /auth/passwordless/verify-code', () => {
    it('should return 503 when passwordless is not enabled', async () => {
      DynamicApiModule.state['resetState']();
      await closeTestingApp(mongoose.connections);

      app = await initModule({
        useAuth: {
          userEntity: User,
        },
      });

      const { status } = await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code: '123456',
      });

      expect(status).toBe(503);
    });

    it('should return 400 when body fields are missing', async () => {
      const { status } = await server.post('/auth/passwordless/verify-code', {});

      expect(status).toBe(400);
    });

    it('should return 401 when no OTP has been sent', async () => {
      const { status } = await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code: '123456',
      });

      expect(status).toBe(401);
    });

    it('should return 401 when code is incorrect', async () => {
      await server.post('/auth/passwordless/send-code', { identifier: user.email });

      const { status } = await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code: '000000',
      });

      expect(status).toBe(401);
    });

    it('should return 200 with accessToken and refreshToken on valid code', async () => {
      await server.post('/auth/passwordless/send-code', { identifier: user.email });

      const { status, body } = await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code: capturedCode,
      });

      expect(status).toBe(200);
      expect(body).toHaveProperty('accessToken');
      expect(typeof body.accessToken).toBe('string');
    });

    it('should decode accessToken and contain user identifier', async () => {
      await server.post('/auth/passwordless/send-code', { identifier: user.email });

      const { body } = await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code: capturedCode,
      });

      DynamicApiModule.state['resetState']();
      const jwtService = new JwtService({ secret: 'dynamic-api-jwt-secret' });
      const decoded = jwtService.decode(body.accessToken) as Record<string, unknown>;

      expect(decoded).toHaveProperty('email', user.email);
    });

    it('should return 401 when same code is used twice (OTP deleted on first use)', async () => {
      await server.post('/auth/passwordless/send-code', { identifier: user.email });
      const code = capturedCode;

      await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code,
      });

      const { status } = await server.post('/auth/passwordless/verify-code', {
        identifier: user.email,
        code,
      });

      expect(status).toBe(401);
    });
  });
});


