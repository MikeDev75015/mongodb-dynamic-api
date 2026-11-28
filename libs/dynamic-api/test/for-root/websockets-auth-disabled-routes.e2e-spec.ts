import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { SocketAdapter } from '../../src/adapters/socket-adapter';
import { closeTestingApp, handleSocketException, handleSocketResponse, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createRegisterUserEntity, initModule, REGISTER_ADMIN } from '../shared';

describe('DynamicApiModule forRoot - Websockets with register.disabled / updateAccount.disabled (e2e)', () => {
  const User = createRegisterUserEntity();
  type User = InstanceType<typeof User>;

  const admin = REGISTER_ADMIN;

  const fixtures = async (_: Connection) => {
    const bcryptService = new BcryptService();
    const model = await getModelFromEntity(User);
    await model.insertMany([{ ...admin, password: await bcryptService.hashPassword(admin.password) }]);
  };

  const initWebSocketModule = (useAuth: { register?: { disabled: boolean }; updateAccount?: { disabled: boolean } }) =>
    initModule(
      { useAuth: { userEntity: User, ...useAuth }, webSocket: true },
      fixtures,
      async (app: INestApplication) => {
        app.useWebSocketAdapter(new SocketAdapter(app));
      },
    );

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('register.disabled: true', () => {
    beforeEach(async () => {
      await initWebSocketModule({ register: { disabled: true } });
    });

    it('should not listen for auth-register at all (no response, no exception)', async () => {
      await expect(
        server.emit('auth-register', { email: 'new@test.co', password: 'new-password' }, { timeoutMs: 1500 }),
      ).rejects.toThrow('Socket event timeout');

      expect(handleSocketResponse).not.toHaveBeenCalled();
      expect(handleSocketException).not.toHaveBeenCalled();
    });

    it('should keep auth-login working', async () => {
      const { accessToken } = await server.emit('auth-login', { email: admin.email, password: admin.password });

      expect(accessToken).toEqual(expect.any(String));
    });
  });

  describe('updateAccount.disabled: true', () => {
    beforeEach(async () => {
      await initWebSocketModule({ updateAccount: { disabled: true } });
    });

    it('should not listen for auth-update-account at all', async () => {
      const { accessToken } = await server.emit('auth-login', { email: admin.email, password: admin.password });
      handleSocketResponse.mockReset();

      await expect(
        server.emit('auth-update-account', { role: 'client' }, { accessToken, timeoutMs: 1500 }),
      ).rejects.toThrow('Socket event timeout');

      expect(handleSocketResponse).not.toHaveBeenCalled();
      expect(handleSocketException).not.toHaveBeenCalled();
    });

    it('should keep auth-register working', async () => {
      await server.emit('auth-register', { email: 'new@test.co', password: 'new-password' });

      expect(handleSocketException).not.toHaveBeenCalled();
      expect(handleSocketResponse).toHaveBeenCalledWith({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    });
  });
});
