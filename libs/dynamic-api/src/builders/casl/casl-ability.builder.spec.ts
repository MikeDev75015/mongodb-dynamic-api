import { PureAbility } from '@casl/ability';
import { RouteType } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CaslAbilityBuilder } from './casl-ability.builder';

describe('CaslAbilityBuilder', () => {
  class User {
    isAdmin: boolean;

    constructor(isAdmin = false) {
      this.isAdmin = isAdmin;
    }
  }

  class Test extends BaseEntity {}
  const entity = Test;
  const routeType: RouteType = 'GetMany';
  const predicate = jest.fn((test: Test, user: User) => user.isAdmin);
  const user = new User();
  const expectedError = new Error('Invalid parameters, cannot build ability');

  it('should return a function', () => {
    expect(typeof CaslAbilityBuilder).toBe('function');
  });

  it('should throw an error when called with invalid routeType', () => {
    expect(() => CaslAbilityBuilder(entity, undefined, predicate, user)).toThrow(expectedError);
  });

  it('should throw an error when called with invalid entity', () => {
    expect(() => CaslAbilityBuilder(null, routeType, predicate, user)).toThrow(expectedError);
  });

  it('should throw an error when called with invalid predicate', () => {
    expect(() => CaslAbilityBuilder(entity, routeType, null, user)).toThrow(expectedError);
  });

  it('should throw an error when called with invalid user', () => {
    expect(() => CaslAbilityBuilder(entity, routeType, predicate, null)).toThrow(expectedError);
  });

  it('should return an AppAbility instance when called with valid parameters', () => {
    class User {
      isAdmin: boolean;

      constructor(isAdmin: boolean) {
        this.isAdmin = isAdmin;
      }
    }

    class Test extends BaseEntity {}
    const entity = Test;
    const routeType: RouteType = 'GetMany';
    const predicate = jest.fn((test: Test, user: User) => user.isAdmin);
    const user = new User(true);

    const ability = CaslAbilityBuilder(entity, routeType, predicate, user);

    expect(ability).toBeInstanceOf(PureAbility);
  });
});
