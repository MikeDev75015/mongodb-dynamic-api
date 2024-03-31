import { BaseEntity } from '../../../models';
import { AuthService } from '../interfaces';
import { AuthControllerMixin } from './auth-controller.mixin';

describe('AuthControllerMixin', () => {
  class TestEntity extends BaseEntity {
    loginField: string;

    passwordField: string;

    additionalField?: string;
  }

  let service: AuthService<TestEntity>;

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      register: jest.fn(),
      getAccount: jest.fn(),
    } as unknown as AuthService<TestEntity>;
  });

  it('should create AuthController with login endpoint', () => {
    const AuthController = AuthControllerMixin(TestEntity, 'loginField', 'passwordField', ['additionalField']);
    const controller = new AuthController(service);

    expect(controller.login).toBeDefined();
  });

  it('should create AuthController with register endpoint', () => {
    const AuthController = AuthControllerMixin(TestEntity, 'loginField', 'passwordField');
    const controller = new AuthController(service);

    expect(controller.register).toBeDefined();
  });

  it('should create AuthController with getAccount endpoint', () => {
    const AuthController = AuthControllerMixin(TestEntity, 'loginField', 'passwordField');
    const controller = new AuthController(service);

    expect(controller.getAccount).toBeDefined();
  });

  it('should throw error when invalid entity is provided', () => {
    expect(() => AuthControllerMixin<TestEntity>(null, 'loginField', 'passwordField')).toThrow();
  });

  it('should throw error when invalid loginField is provided', () => {
    expect(() => AuthControllerMixin(TestEntity, null, 'passwordField')).toThrow();
  });

  it('should throw error when invalid passwordField is provided', () => {
    expect(() => AuthControllerMixin(TestEntity, 'loginField', null)).toThrow();
  });
});