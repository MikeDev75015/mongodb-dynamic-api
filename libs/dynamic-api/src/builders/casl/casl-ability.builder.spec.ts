import { RouteType } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CaslAbilityBuilder } from './casl-ability.builder';

describe('CaslAbilityBuilder', () => {
  it('should return a function', () => {
    expect(typeof CaslAbilityBuilder).toBe('function');
  });

  it('should be an instance of AbilityBuilder', () => {
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
    const test = new Test();
    const user = new User(true);

    const builder = CaslAbilityBuilder(entity, routeType, predicate, user);

    expect(typeof builder).toBe('object');
    expect(predicate).toHaveBeenCalledWith(test, user);
  });
});
