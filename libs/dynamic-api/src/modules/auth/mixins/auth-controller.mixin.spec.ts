import { createMock } from '@golevelup/ts-jest';
import { BaseEntity } from '../../../models';
import { AuthService } from '../interfaces';
import { AuthControllerMixin } from './auth-controller.mixin';

describe('AuthControllerMixin', () => {
  class TestEntity extends BaseEntity {
    loginField: string;

    passwordField: string;

    field1?: string;

    field2?: string;

    field3?: string;
  }

  const service = createMock<AuthService<TestEntity>>();

  it('should throw error when invalid entity is provided', () => {
    expect(() => AuthControllerMixin<TestEntity>(
      null,
      'loginField',
      'passwordField',
      undefined,
      undefined,
      undefined,
    ))
    .toThrow();
  });

  it('should throw error when invalid loginField is provided', () => {
    expect(() => AuthControllerMixin(
      TestEntity,
      null,
      'passwordField',
    undefined,
      undefined,
      undefined,
    )).toThrow();
  });

  it('should throw error when invalid passwordField is provided', () => {
    expect(() => AuthControllerMixin(
      TestEntity,
      'loginField',
      null,
      undefined,
      undefined,
      undefined,
    )).toThrow();
  });

  it('should create AuthController', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      'loginField',
      'passwordField',
      undefined,
      undefined,
      undefined,
    );
    const controller = new AuthController(service);

    expect(controller).toBeDefined();
    expect(controller).toHaveProperty('login', expect.any(Function));
    expect(controller).toHaveProperty('register', expect.any(Function));
    expect(controller).toHaveProperty('getAccount', expect.any(Function));
    expect(controller).toHaveProperty('updateAccount', expect.any(Function));
    expect(controller).toHaveProperty('resetPassword', expect.any(Function));
    expect(controller).toHaveProperty('changePassword', expect.any(Function));
  });

  it('should create AuthController with additional fields', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      'loginField',
      'passwordField',
      ['field1'],
      {
        additionalFields: ['field1', { name: 'field2', required: true }, { name: 'field3', required: false }],
        abilityPredicate: (user: any) => user.isAdmin,
        protected: true,
      },
      undefined
    );
    const controller = new AuthController(service);

    expect(controller).toBeDefined();
    expect(controller).toHaveProperty('login', expect.any(Function));
    expect(controller).toHaveProperty('register', expect.any(Function));
    expect(controller).toHaveProperty('getAccount', expect.any(Function));
    expect(controller).toHaveProperty('resetPassword', expect.any(Function));
    expect(controller).toHaveProperty('changePassword', expect.any(Function));
  });

  describe('getAccount', () => {
    it('should call service getAccount', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        'loginField',
        'passwordField',
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.getAccount({ user });

      expect(service.getAccount).toHaveBeenCalledWith(user);
    });
  });

  describe('updateAccount', () => {
    it('should call service updateAccount', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        'loginField',
        'passwordField',
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.updateAccount({ user }, {});

      expect(service.updateAccount).toHaveBeenCalledWith(user, {});
    });
  });

  describe('login', () => {
    it('should call service login', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        'loginField',
        'passwordField',
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.login({ user }, {});

      expect(service.login).toHaveBeenCalledWith(user);
    });
  });

  describe('register', () => {
    it('should call service register', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        'loginField',
        'passwordField',
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);
      const user = new TestEntity();

      await controller.register({ user });

      expect(service.register).toHaveBeenCalledWith({ user });
    });
  });

  describe('resetPassword', () => {
    it('should call service resetPassword', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        'loginField',
        'passwordField',
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);

      await controller.resetPassword({ email: 'fake-email' });

      expect(service.resetPassword).toHaveBeenCalledWith('fake-email');
    });
  });

  describe('changePassword', () => {
    it('should call service changePassword', async () => {
      const AuthController = AuthControllerMixin(
        TestEntity,
        'loginField',
        'passwordField',
        undefined,
        undefined,
        undefined,
      );
      const controller = new AuthController(service);

      await controller.changePassword({ resetPasswordToken: 'fake-token', newPassword: 'fake-password' });

      expect(service.changePassword).toHaveBeenCalledWith('fake-token', 'fake-password');
    });
  });
});