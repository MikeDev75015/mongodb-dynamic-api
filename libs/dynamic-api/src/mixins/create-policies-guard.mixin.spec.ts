import { RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { CreatePoliciesGuardMixin } from './create-policies-guard.mixin';

class TestEntity extends BaseEntity {}

describe('CreatePoliciesGuardMixin', () => {
  let service: any;
  const routeType: RouteType = 'CreateOne';
  const displayedName = 'DisplayedName';

  beforeEach(async () => {
    service = {} as any;
  });

  it('should create a PoliciesGuard with the correct name', () => {
    const guard = CreatePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined);
    expect(guard.name).toBe(`CreateOne${displayedName}V1PoliciesGuard`);
  });

  it('should create a PoliciesGuard with the correct routeType', () => {
    const guard = new (
      CreatePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined)
    )(service);
    expect(guard['routeType']).toBe(routeType);
  });

  it('should create a PoliciesGuard with the correct entity', () => {
    const guard = new (
      CreatePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined)
    )(service);
    expect(guard['entity']).toBe(TestEntity);
  });

  it('should create a PoliciesGuard with the correct abilityPredicate', () => {
    const abilityPredicate = (_: TestEntity) => true;
    const guard = new (
      CreatePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', abilityPredicate)
    )(service);
    expect(guard['abilityPredicate']).toBe(abilityPredicate);
  });

  it('should create a PoliciesGuard without abilityPredicate if not provided', () => {
    const guard = new (
      CreatePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined)
    )(service);
    expect(guard['abilityPredicate']).toBeUndefined();
  });
});