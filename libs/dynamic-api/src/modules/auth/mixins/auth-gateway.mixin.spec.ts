import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { ObjectId } from 'mongoose';
import { getFullAuthOptionsMock } from '../../../../__mocks__/auth-full-options.mock';
import { ExtendedSocket } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { AuthGateway, AuthService, LoginResponse } from '../interfaces';
import { AuthGatewayMixin } from './auth-gateway.mixin';

describe('AuthGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    loginField: string;

    passwordField: string;

    field1?: string;

    field2?: string;

    field3?: string;
  }

  const service = createMock<AuthService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const { login, register, resetPassword, updateAccount } = getFullAuthOptionsMock(
    TestEntity,
    'loginField',
    'passwordField',
    ['field1'],
    [{ name: 'field1', required: true }, 'field2', { name: 'field3', required: false }],
    ['field3'],
  );

  const fakeUser: TestEntity = {
    _id: 'fake-id' as unknown as ObjectId,
    id: 'fake-id',
    loginField: 'fake-login',
    passwordField: 'fake-password',
    field1: 'fake-field1',
    field2: 'fake-field2',
    field3: 'fake-field3',
    __v: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const fakeAccount = { id: fakeUser.id } as TestEntity;
  const accessToken = 'fake-token';
  const fakeLoginResponse: LoginResponse = { accessToken };

  it('should throw error when invalid entity is provided', () => {
    expect(() => AuthGatewayMixin<TestEntity>(
      null,
      login,
      undefined,
      undefined,
      undefined,
    ))
    .toThrow();
  });

  it('should create gateway with default options', () => {
    const AuthGateway = AuthGatewayMixin(
      TestEntity,
      login,
    );

    const gateway = new AuthGateway(service, jwtService);

    expect(gateway).toBeDefined();
    expect(gateway).toHaveProperty('login', expect.any(Function));
    expect(gateway).toHaveProperty('register', expect.any(Function));
    expect(gateway).toHaveProperty('getAccount', expect.any(Function));
    expect(gateway).toHaveProperty('updateAccount', expect.any(Function));
    expect(gateway).toHaveProperty('resetPassword', expect.any(Function));
    expect(gateway).toHaveProperty('changePassword', expect.any(Function));
    expect(gateway).toHaveProperty('refreshToken', expect.any(Function));
  });

  it('should create gateway with custom options', () => {
    const AuthGateway = AuthGatewayMixin(
      TestEntity,
      login,
      register,
      resetPassword,
      updateAccount,
    );

    const gateway = new AuthGateway(service, jwtService);

    expect(gateway).toBeDefined();
    expect(gateway).toHaveProperty('login', expect.any(Function));
    expect(gateway).toHaveProperty('register', expect.any(Function));
    expect(gateway).toHaveProperty('getAccount', expect.any(Function));
    expect(gateway).toHaveProperty('updateAccount', expect.any(Function));
    expect(gateway).toHaveProperty('resetPassword', expect.any(Function));
    expect(gateway).toHaveProperty('changePassword', expect.any(Function));
    expect(gateway).toHaveProperty('refreshToken', expect.any(Function));
  });

  describe('getAccount', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    beforeEach(() => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
      );

      gateway = new AuthGateway(service, jwtService);
      service.getAccount.mockResolvedValue(fakeAccount);
      socket = {} as ExtendedSocket<TestEntity>;
    });

    it('should set account in data if user is logged', async () => {
      socket.user = fakeUser;
      const result = await gateway.getAccount(socket);

      expect(result).toEqual({
        event: 'auth-get-account',
        data: fakeAccount,
      });
      expect(service.getAccount).toHaveBeenCalledTimes(1);
      expect(service.getAccount).toHaveBeenCalledWith(fakeUser);
    });

    it('should not set account in data if user is logged', async () => {
      const result = await gateway.getAccount(socket);

      expect(result).toEqual({
        event: 'auth-get-account',
        data: undefined,
      });
      expect(service.getAccount).not.toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    const updateBody = { field1: 'new-field1' };

    beforeEach(() => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
      );

      gateway = new AuthGateway(service, jwtService);
      service.updateAccount.mockResolvedValue(fakeAccount);
      socket = {} as ExtendedSocket<TestEntity>;
    });

    it('should update account if user is logged', async () => {
      socket.user = fakeUser;
      const result = await gateway.updateAccount(socket, updateBody);

      expect(result).toEqual({
        event: 'auth-update-account',
        data: fakeAccount,
      });
      expect(service.updateAccount).toHaveBeenCalledTimes(1);
      expect(service.updateAccount).toHaveBeenCalledWith(fakeUser, updateBody);
    });

    it('should not update account if user is not logged', async () => {
      const result = await gateway.updateAccount(socket, updateBody);

      expect(result).toEqual({
        event: 'auth-update-account',
        data: undefined,
      });
      expect(service.updateAccount).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    const loginDto = { loginField: 'fake-login', passwordField: 'fake-password' };

    beforeEach(() => {
      service.login.mockResolvedValue(fakeLoginResponse);
      socket = {} as ExtendedSocket<TestEntity>;
    });

    it('should validate and login user if credentials are valid', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        { ...login, abilityPredicate: undefined },
      );
      gateway = new AuthGateway(service, jwtService);
      service.validateUser.mockResolvedValue(fakeUser);

      const result = await gateway.login(socket, loginDto);

      expect(result).toEqual({
        event: 'auth-login',
        data: fakeLoginResponse,
      });
      expect(service.validateUser).toHaveBeenCalledTimes(1);
      expect(service.validateUser).toHaveBeenCalledWith(loginDto.loginField, loginDto.passwordField);
      expect(socket.user).toEqual(fakeUser);
      expect(service.login).toHaveBeenCalledTimes(1);
      expect(service.login).toHaveBeenCalledWith(fakeUser);
    });

    it('should throw Unauthorized error if credentials are invalid', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        { ...login, abilityPredicate: undefined },
      );
      gateway = new AuthGateway(service, jwtService);
      service.validateUser.mockResolvedValue(undefined);

      await expect(gateway.login(socket, {})).rejects.toThrow(new WsException('Unauthorized'));

      expect(socket.user).toBeUndefined();
      expect(service.login).not.toHaveBeenCalled();
    });

    it('should throw Access denied error if user does not have permission to login', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
      );
      gateway = new AuthGateway(service, jwtService);
      service.validateUser.mockResolvedValue(fakeUser);
      login.abilityPredicate = jest.fn(() => false);

      await expect(gateway.login(socket, loginDto)).rejects.toThrow(new WsException('Access denied'));

      expect(socket.user).toEqual(fakeUser);
      expect(service.login).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    const registerDto = { loginField: 'fake-login', passwordField: 'fake-password' };

    beforeEach(() => {
      service.register.mockResolvedValue(fakeLoginResponse);
      socket = {} as ExtendedSocket<TestEntity>;
    });

    it('should register user if credentials are valid', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
      );
      gateway = new AuthGateway(service, jwtService);

      const result = await gateway.register(socket, registerDto);

      expect(result).toEqual({
        event: 'auth-register',
        data: fakeLoginResponse,
      });
      expect(service.register).toHaveBeenCalledTimes(1);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('resetPassword', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    const resetPasswordDto = { email: 'fake-login' };

    beforeEach(() => {
      service.resetPassword.mockResolvedValue();
      socket = {} as ExtendedSocket<TestEntity>;
    });

    it('should reset password if options are set', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
        register,
        resetPassword,
      );
      gateway = new AuthGateway(service, jwtService);

      const result = await gateway.resetPassword(resetPasswordDto);

      expect(result).toEqual({
        event: 'auth-reset-password',
        data: undefined,
      });
      expect(service.resetPassword).toHaveBeenCalledTimes(1);
      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto.email);
    });

    it('should not reset password if options are not set', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
        register,
      );
      gateway = new AuthGateway(service, jwtService);

      await expect(gateway.resetPassword(resetPasswordDto))
      .rejects
      .toThrow(new WsException('This feature is not enabled'));

      expect(service.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    const changePasswordDto = { resetPasswordToken: 'fake-token', newPassword: 'new-password' };

    beforeEach(() => {
      service.changePassword.mockResolvedValue();
      socket = {} as ExtendedSocket<TestEntity>;
    });

    it('should change password if options are set', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
        register,
        resetPassword,
      );
      gateway = new AuthGateway(service, jwtService);

      const result = await gateway.changePassword(changePasswordDto);

      expect(result).toEqual({
        event: 'auth-change-password',
        data: undefined,
      });
      expect(service.changePassword).toHaveBeenCalledTimes(1);
      expect(service.changePassword)
      .toHaveBeenCalledWith(changePasswordDto.resetPasswordToken, changePasswordDto.newPassword);
    });

    it('should not change password if options are not set', async () => {
      const AuthGateway = AuthGatewayMixin(
        TestEntity,
        login,
        register,
      );
      gateway = new AuthGateway(service, jwtService);

      await expect(gateway.changePassword(changePasswordDto))
      .rejects
      .toThrow(new WsException('This feature is not enabled'));

      expect(service.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    let gateway: AuthGateway<TestEntity>;
    let socket: ExtendedSocket<TestEntity>;

    beforeEach(() => {
      service.refreshToken.mockResolvedValue(fakeLoginResponse);
      socket = { handshake: { query: {} } } as unknown as ExtendedSocket<TestEntity>;
    });

    it('should return new token if user is logged', async () => {
      const AuthGateway = AuthGatewayMixin(TestEntity, login);
      gateway = new AuthGateway(service, jwtService);
      socket.user = fakeUser;
      (socket.handshake.query as any).refreshToken = 'fake-raw-refresh';

      const result = await gateway.refreshToken(socket);

      expect(result).toEqual({ event: 'auth-refresh-token', data: fakeLoginResponse });
      expect(service.refreshToken).toHaveBeenCalledTimes(1);
      expect(service.refreshToken).toHaveBeenCalledWith(fakeUser, 'fake-raw-refresh');
    });

    it('should return undefined data if user is not logged', async () => {
      const AuthGateway = AuthGatewayMixin(TestEntity, login);
      gateway = new AuthGateway(service, jwtService);

      const result = await gateway.refreshToken(socket);

      expect(result).toEqual({ event: 'auth-refresh-token', data: undefined });
      expect(service.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    let socket: ExtendedSocket<TestEntity>;

    beforeEach(() => {
      socket = {
        user: fakeUser,
        broadcast: { emit: jest.fn() },
        handshake: { query: {} },
      } as unknown as ExtendedSocket<TestEntity>;

      service.getAccount.mockResolvedValue(fakeAccount);
      service.updateAccount.mockResolvedValue(fakeAccount);
      service.login.mockResolvedValue(fakeLoginResponse);
      service.register.mockResolvedValue(fakeLoginResponse);
      service.validateUser.mockResolvedValue(fakeUser);
      jwtService.decode.mockReturnValue({ id: fakeUser.id, loginField: fakeUser.loginField, iat: 1, exp: 9999 });
    });

    afterEach(() => jest.clearAllMocks());

    describe('login broadcast', () => {
      it('should broadcast user fields on login with broadcast enabled', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          { ...login, abilityPredicate: undefined, broadcast: { enabled: true, fields: ['id', 'loginField'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.login(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-login-broadcast',
          [{ id: fakeUser.id, loginField: fakeUser.loginField }],
        );
      });

      it('should broadcast all user fields when no fields specified', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          { ...login, abilityPredicate: undefined, broadcast: { enabled: true } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.login(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-login-broadcast',
          [expect.objectContaining({ id: fakeUser.id, loginField: fakeUser.loginField })],
        );
      });

      it('should use custom eventName for login broadcast', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          { ...login, abilityPredicate: undefined, broadcast: { enabled: true, eventName: 'custom-event', fields: ['id'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.login(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(socket.broadcast.emit).toHaveBeenCalledWith('custom-event', [{ id: fakeUser.id }]);
      });

      it('should not broadcast on login when broadcast config is not set', async () => {
        const AuthGateway = AuthGatewayMixin(TestEntity, { ...login, abilityPredicate: undefined, broadcast: undefined });
        const gateway = new AuthGateway(service, jwtService);

        await gateway.login(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(socket.broadcast.emit).not.toHaveBeenCalled();
      });
    });

    describe('register broadcast', () => {
      it('should decode JWT and broadcast user fields on register', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          { ...register, broadcast: { enabled: true, fields: ['id', 'loginField'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.register(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(jwtService.decode).toHaveBeenCalledWith(accessToken);
        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-register-broadcast',
          [{ id: fakeUser.id, loginField: fakeUser.loginField }],
        );
      });

      it('should broadcast all decoded JWT fields when no fields specified', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          { ...register, broadcast: { enabled: true } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.register(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-register-broadcast',
          [expect.objectContaining({ id: fakeUser.id, loginField: fakeUser.loginField })],
        );
      });

      it('should not broadcast on register when broadcast config is not set', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          { ...register, broadcast: undefined },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.register(socket, { loginField: fakeUser.loginField, passwordField: fakeUser.passwordField });

        expect(socket.broadcast.emit).not.toHaveBeenCalled();
      });
    });

    describe('getAccount broadcast', () => {
      it('should broadcast account with specified fields', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          undefined,
          { broadcast: { enabled: true, fields: ['id'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.getAccount(socket);

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-get-account-broadcast',
          [{ id: fakeUser.id }],
        );
      });

      it('should broadcast all account fields when no fields specified', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          undefined,
          { broadcast: { enabled: true } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.getAccount(socket);

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-get-account-broadcast',
          [fakeAccount],
        );
      });

      it('should use custom eventName for getAccount broadcast', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          undefined,
          { broadcast: { enabled: true, eventName: 'custom-get-account', fields: ['id'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.getAccount(socket);

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'custom-get-account',
          [{ id: fakeUser.id }],
        );
      });

      it('should not broadcast getAccount when broadcast config is not set', async () => {
        const AuthGateway = AuthGatewayMixin(TestEntity, login);
        const gateway = new AuthGateway(service, jwtService);

        await gateway.getAccount(socket);

        expect(socket.broadcast.emit).not.toHaveBeenCalled();
      });
    });

    describe('updateAccount broadcast', () => {
      it('should broadcast updated account with specified fields', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          { ...updateAccount, broadcast: { enabled: true, fields: ['id'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.updateAccount(socket, {});

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-update-account-broadcast',
          [{ id: fakeUser.id }],
        );
      });

      it('should broadcast all updated account fields when no fields specified', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          { ...updateAccount, broadcast: { enabled: true } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.updateAccount(socket, {});

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'auth-update-account-broadcast',
          [fakeAccount],
        );
      });

      it('should use custom eventName for updateAccount broadcast', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          { ...updateAccount, broadcast: { enabled: true, eventName: 'custom-update-account', fields: ['id'] } },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.updateAccount(socket, {});

        expect(socket.broadcast.emit).toHaveBeenCalledWith(
          'custom-update-account',
          [{ id: fakeUser.id }],
        );
      });

      it('should not broadcast updateAccount when broadcast config is not set', async () => {
        const AuthGateway = AuthGatewayMixin(
          TestEntity,
          login,
          register,
          undefined,
          { ...updateAccount, broadcast: undefined },
        );
        const gateway = new AuthGateway(service, jwtService);

        await gateway.updateAccount(socket, {});

        expect(socket.broadcast.emit).not.toHaveBeenCalled();
      });
    });
  });
});
