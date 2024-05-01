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

  it('should create AuthController with login, register and getAccount endpoints', () => {
    const AuthController = AuthControllerMixin(
      TestEntity,
      'loginField',
      'passwordField',
      undefined,
      undefined,
      undefined,
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
      },
      undefined
    );
    const controller = new AuthController(service);

    expect(controller.login).toBeDefined();
    expect(controller.register).toBeDefined();
    expect(controller.getAccount).toBeDefined();
  });
});