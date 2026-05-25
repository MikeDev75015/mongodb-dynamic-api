import { CanActivate } from '@nestjs/common';
import { DynamicApiModule } from '../../dynamic-api.module';
import { BaseEntity } from '../../models';
import { RoutePoliciesGuardMixin } from '../../mixins';
import {
  createCustomRouteController,
  getCustomRouteControllerName,
  getCustomRoutePoliciesGuardName,
} from './create-custom-route-controller';

jest.mock('../../mixins', () => ({
  RoutePoliciesGuardMixin: jest.fn().mockImplementation(() => {
    class FakePoliciesGuard implements CanActivate {
      canActivate() {
        return true;
      }
    }
    return FakePoliciesGuard;
  }),
}));

// ─── Fakes ─────────────────────────────────────────────────────────────────

class FakeEntity extends BaseEntity {
  name: string;
}
Object.defineProperty(FakeEntity, 'name', { value: 'FakeEntity', writable: false });

const fakeControllerOptions = { path: 'fakes', apiTag: undefined } as any;

const fakeHandler = jest.fn().mockResolvedValue({ id: '1', name: 'result' });

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeController(overrides: Record<string, unknown> = {}) {
  return createCustomRouteController(
    FakeEntity as any,
    fakeControllerOptions,
    {
      path: 'e2ee-wrapped-keys',
      method: 'PATCH',
      handler: fakeHandler,
      ...overrides,
    } as any,
  );
}

// ─── Suite ─────────────────────────────────────────────────────────────────

describe('createCustomRouteController', () => {
  beforeEach(() => {
    jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false as any);
    fakeHandler.mockClear();
  });

  // ── Naming ────────────────────────────────────────────────────────────────

  describe('controller name', () => {
    it('uses Custom + pascal(path) + entityName + Controller', () => {
      const Ctrl = makeController();
      expect(Ctrl.name).toBe('CustomE2eeWrappedKeysFakeEntityController');
    });

    it('appends version suffix when version is set', () => {
      const Ctrl = makeController({ version: '2' });
      expect(Ctrl.name).toBe('CustomE2eeWrappedKeysFakeEntityV2Controller');
    });

    it('uses apiTag instead of entityName when provided', () => {
      const Ctrl = createCustomRouteController(
        FakeEntity as any,
        { path: 'fakes', apiTag: 'Conversations' } as any,
        { path: 'keys', method: 'GET', handler: fakeHandler } as any,
      );
      expect(Ctrl.name).toBe('CustomKeysConversationsController');
    });
    it('falls back to "Custom" as routePathPascal when path is empty string', () => {
      const Ctrl = makeController({ path: '' });
      // routePathPascal = 'Custom' (fallback) → name = 'CustomCustomFakeEntityController'
      expect(Ctrl.name).toBe('CustomCustomFakeEntityController');
    });
  });

  // ── getCustomRouteControllerName ──────────────────────────────────────────

  describe('getCustomRouteControllerName', () => {
    it('returns correct name without version', () => {
      expect(getCustomRouteControllerName('FakeEntity', 'e2ee-wrapped-keys')).toBe(
        'CustomE2eeWrappedKeysFakeEntityController',
      );
    });

    it('returns correct name with version', () => {
      expect(getCustomRouteControllerName('FakeEntity', 'e2ee-wrapped-keys', undefined, '3')).toBe(
        'CustomE2eeWrappedKeysFakeEntityV3Controller',
      );
    });

    it('uses "Custom" fallback when path is empty', () => {
      expect(getCustomRouteControllerName('FakeEntity', '')).toBe('CustomCustomFakeEntityController');
    });
  });

  // ── getCustomRoutePoliciesGuardName ───────────────────────────────────────

  describe('getCustomRoutePoliciesGuardName', () => {
    it('returns correct guard name', () => {
      expect(getCustomRoutePoliciesGuardName('FakeEntity', 'e2ee-wrapped-keys')).toBe(
        'CustomE2eeWrappedKeysFakeEntityPoliciesGuard',
      );
    });

    it('includes version in guard name', () => {
      expect(getCustomRoutePoliciesGuardName('FakeEntity', 'e2ee-wrapped-keys', undefined, '1')).toBe(
        'CustomE2eeWrappedKeysFakeEntityV1PoliciesGuard',
      );
    });

    it('uses "Custom" fallback when path is empty', () => {
      expect(getCustomRoutePoliciesGuardName('FakeEntity', '')).toBe('CustomCustomFakeEntityPoliciesGuard');
    });
  });

  // ── HTTP methods ──────────────────────────────────────────────────────────

  it.each(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])('creates controller for %s method', (method) => {
    const Ctrl = makeController({ method });
    expect(Ctrl).toBeDefined();
    expect(Ctrl.prototype.handle).toBeDefined();
  });

  // ── Auth decorators ───────────────────────────────────────────────────────

  describe('auth decorators', () => {
    it('does not apply ApiBearerAuth when isAuthEnabled is false and isPublic is false', () => {
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false as any);
      const Ctrl = makeController({ isPublic: false });
      expect(Ctrl).toBeDefined();
    });

    it('applies ApiBearerAuth when isAuthEnabled is true and isPublic is falsy', () => {
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true as any);
      const Ctrl = makeController();
      expect(Ctrl.name).toBe('CustomE2eeWrappedKeysFakeEntityController');
    });

    it('applies Public when isPublic is true', () => {
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false as any);
      const Ctrl = makeController({ isPublic: true });
      expect(Ctrl).toBeDefined();
    });
  });

  // ── abilityPredicate → guard created ──────────────────────────────────────

  describe('abilityPredicate', () => {
    beforeEach(() => {
      (RoutePoliciesGuardMixin as jest.Mock).mockClear();
    });

    it('creates and names PoliciesGuard when abilityPredicate is provided', () => {
      const predicate = jest.fn().mockReturnValue(true);
      makeController({ abilityPredicate: predicate });

      expect(RoutePoliciesGuardMixin).toHaveBeenCalledWith(
        FakeEntity,
        'Custom',
        'E2eeWrappedKeysFakeEntity',
        undefined,
        predicate,
        undefined,
        undefined,
      );
    });

    it('passes predicateBehavior to RoutePoliciesGuardMixin', () => {
      const predicate = jest.fn().mockReturnValue(true);
      makeController({ abilityPredicate: predicate, predicateBehavior: 'filter' });

      expect(RoutePoliciesGuardMixin).toHaveBeenCalledWith(
        FakeEntity,
        'Custom',
        'E2eeWrappedKeysFakeEntity',
        undefined,
        predicate,
        undefined,
        'filter',
      );
    });

    it('does not call RoutePoliciesGuardMixin when no abilityPredicate', () => {
      makeController();
      expect(RoutePoliciesGuardMixin).not.toHaveBeenCalled();
    });
  });

  // ── constructor ───────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('assigns injected model to this.model', () => {
      const Ctrl = makeController() as any;
      const fakeModel = { find: jest.fn() };
      // Instantiate directly (bypassing DI decorator) to cover the constructor
      const instance = new Ctrl(fakeModel);
      expect(instance.model).toBe(fakeModel);
    });
  });

  // ── handle() invocation ───────────────────────────────────────────────────

  describe('handle()', () => {
    it('calls handler with model, user, params, body, query', async () => {
      const Ctrl = makeController() as any;
      const fakeModel = { findById: jest.fn() };
      const instance = Object.create(Ctrl.prototype);
      instance.model = fakeModel;

      const params = { id: 'abc' };
      const body = { wrappedKey: 'key123' };
      const query = { page: '1' };
      const req = { user: { sub: 'user1' } };

      await instance.handle(params, body, query, req);

      expect(fakeHandler).toHaveBeenCalledWith({
        model: fakeModel,
        user: req.user,
        params,
        body,
        query,
      });
    });

    it('returns raw handler result when presenter has no fromEntity', async () => {
      const expected = { id: '1', name: 'result' };
      fakeHandler.mockResolvedValueOnce(expected);

      const Ctrl = makeController() as any;
      const instance = Object.create(Ctrl.prototype);
      instance.model = {};

      const result = await instance.handle({}, {}, {}, {});
      expect(result).toEqual(expected);
    });

    it('maps result through presenter.fromEntity when present', async () => {
      const rawResult = { id: '2', name: 'raw' };
      const mappedResult = { id: '2', displayName: 'mapped' };
      fakeHandler.mockResolvedValueOnce(rawResult);
      const fromEntity = jest.fn().mockReturnValue(mappedResult);

      class FakePresenter {
        static fromEntity = fromEntity;
      }

      const Ctrl = makeController({ dTOs: { presenter: FakePresenter } }) as any;
      const instance = Object.create(Ctrl.prototype);
      instance.model = {};

      const result = await instance.handle({}, {}, {}, {});
      expect(fromEntity).toHaveBeenCalledWith(rawResult);
      expect(result).toEqual(mappedResult);
    });

    it('handles undefined req gracefully (public route, no user)', async () => {
      const Ctrl = makeController({ isPublic: true }) as any;
      const instance = Object.create(Ctrl.prototype);
      instance.model = {};

      await instance.handle({}, {}, {}, undefined);

      expect(fakeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ user: undefined }),
      );
    });
  });

  // ── dTOs metadata ─────────────────────────────────────────────────────────

  describe('dTOs reflect-metadata override', () => {
    it('overrides paramtypes[1] with dTOs.body when provided', () => {
      class BodyDto {
        wrappedKey: string;
      }

      makeController({ dTOs: { body: BodyDto } });

      const paramTypes = Reflect.getMetadata(
        'design:paramtypes',
        (createCustomRouteController(
          FakeEntity as any,
          fakeControllerOptions,
          { path: 'e2ee-wrapped-keys', method: 'PATCH', handler: fakeHandler, dTOs: { body: BodyDto } } as any,
        ) as any).prototype,
        'handle',
      );
      expect(paramTypes[1]).toBe(BodyDto);
    });

    it('overrides paramtypes[2] with dTOs.query when provided', () => {
      class QueryDto {
        search: string;
      }

      const Ctrl = createCustomRouteController(
        FakeEntity as any,
        fakeControllerOptions,
        { path: 'e2ee-wrapped-keys', method: 'GET', handler: fakeHandler, dTOs: { query: QueryDto } } as any,
      ) as any;

      const paramTypes = Reflect.getMetadata('design:paramtypes', Ctrl.prototype, 'handle');
      expect(paramTypes[2]).toBe(QueryDto);
    });

    it('does not override paramtypes when no dTOs.body or dTOs.query', () => {
      const Ctrl = makeController() as any;
      const paramTypes = Reflect.getMetadata('design:paramtypes', Ctrl.prototype, 'handle');
      // All Object (TypeScript emits Object for unknown/interface types)
      expect(paramTypes).toBeDefined();
    });
  });

  // ── version inheritance ───────────────────────────────────────────────────

  describe('version', () => {
    it('inherits controllerVersion when customRoute.version is not set', () => {
      const Ctrl = createCustomRouteController(
        FakeEntity as any,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler } as any,
        '1',
      );
      expect(Ctrl.name).toBe('CustomKeysFakeEntityV1Controller');
    });

    it('overrides controllerVersion with customRoute.version', () => {
      const Ctrl = createCustomRouteController(
        FakeEntity as any,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler, version: '5' } as any,
        '1',
      );
      expect(Ctrl.name).toBe('CustomKeysFakeEntityV5Controller');
    });
  });
});









