import { Model } from 'mongoose';
import { RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { RoutePoliciesGuardMixin, SocketPoliciesGuardMixin } from './policies-guard.mixin';

class TestEntity extends BaseEntity {}

describe('PoliciesGuardMixin', () => {
  let model: Model<TestEntity>
  const routeType: RouteType = 'CreateOne';

  beforeEach(async () => {
    model = {} as Model<TestEntity>;
  });

  describe('RoutePoliciesGuardMixin', () => {
    const displayedName = 'DisplayedName';

    it('should create a PoliciesGuard with the correct name', () => {
      const guard = RoutePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined);
      expect(guard.name).toBe(`CreateOne${displayedName}V1PoliciesGuard`);
    });

    it('should create a PoliciesGuard with the correct routeType', () => {
      const guard = new (
        RoutePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined)
      )(model);
      expect(guard['routeType']).toBe(routeType);
    });

    it('should create a PoliciesGuard with the correct entity', () => {
      const guard = new (
        RoutePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined)
      )(model);
      expect(guard['entity']).toBe(TestEntity);
    });

    it('should create a PoliciesGuard with the correct abilityPredicate', () => {
      const abilityPredicate = (_: TestEntity) => true;
      const guard = new (
        RoutePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', abilityPredicate)
      )(model);
      expect(guard['abilityPredicate']).toBe(abilityPredicate);
    });

    it('should create a PoliciesGuard without abilityPredicate if not provided', () => {
      const guard = new (
        RoutePoliciesGuardMixin(TestEntity, routeType, displayedName, '1', undefined)
      )(model);
      expect(guard['abilityPredicate']).toBeUndefined();
    });
  });

  describe('SocketPoliciesGuardMixin', () => {
    const event = 'unit-testEvent';
    const isPublic = true;

    it('should create a SocketPoliciesGuard with the correct name', () => {
      const formattedEvent = 'UnitTestEvent';
      const guard = SocketPoliciesGuardMixin(TestEntity, routeType, event, '1', undefined, isPublic);
      expect(guard.name).toBe(`CreateOne${formattedEvent}V1SocketPoliciesGuard`);
    });

    it('should create a SocketPoliciesGuard with the correct routeType', () => {
      const guard = new (
        SocketPoliciesGuardMixin(TestEntity, routeType, event, '1', undefined, isPublic)
      )(model);
      expect(guard['routeType']).toBe(routeType);
    });

    it('should create a SocketPoliciesGuard with the correct entity', () => {
      const guard = new (
        SocketPoliciesGuardMixin(TestEntity, routeType, event, '1', undefined, isPublic)
      )(model);
      expect(guard['entity']).toBe(TestEntity);
    });

    it('should create a SocketPoliciesGuard with the correct abilityPredicate', () => {
      const abilityPredicate = (_: TestEntity) => true;
      const guard = new (
        SocketPoliciesGuardMixin(TestEntity, routeType, event, '1', abilityPredicate, isPublic)
      )(model);
      expect(guard['abilityPredicate']).toBe(abilityPredicate);
    });

    it('should create a SocketPoliciesGuard without abilityPredicate if not provided', () => {
      const guard = new (
        SocketPoliciesGuardMixin(TestEntity, routeType, event, '1', undefined, isPublic)
      )(model);
      expect(guard['abilityPredicate']).toBeUndefined();
    });
  });
});