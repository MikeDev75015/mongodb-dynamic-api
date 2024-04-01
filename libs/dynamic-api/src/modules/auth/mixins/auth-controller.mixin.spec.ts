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

  let service: AuthService<TestEntity>;

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      register: jest.fn(),
      getAccount: jest.fn(),
    } as unknown as AuthService<TestEntity>;
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

  it('should create AuthController with login, register and getAccount endpoints', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      'loginField',
      'passwordField',
    );
    const controller = new AuthController(service);

    expect(controller.login).toBeDefined();
    expect(controller.register).toBeDefined();
    expect(controller.getAccount).toBeDefined();
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
      }
    );
    const controller = new AuthController(service);

    expect(controller.login).toBeDefined();
    expect(controller.register).toBeDefined();
    expect(controller.getAccount).toBeDefined();
  });
});