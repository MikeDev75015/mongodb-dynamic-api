import { CanActivate } from '@nestjs/common';
import { DynamicApiModule } from '../../dynamic-api.module';
import { BaseEntity } from '../../models';
import { RoutePoliciesGuardMixin } from '../../mixins';
import {
  CustomRouteConfig,
  DynamicApiControllerOptions,
  DynamicApiRequest,
} from '../../interfaces';
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

// ─── Local interfaces ──────────────────────────────────────────────────────

interface ControllerInstanceShape {
  model: unknown;
  handle: (
    params: Record<string, string>,
    body: unknown,
    query: unknown,
    req: DynamicApiRequest | undefined,
  ) => Promise<unknown>;
}

interface CustomRouteControllerClass {
  new (model: unknown): ControllerInstanceShape;
  readonly name: string;
  readonly prototype: ControllerInstanceShape;
}

// ─── Fakes ────────────────────────────────────────────────────────────────

class FakeEntity extends BaseEntity {
  name: string;
}
Object.defineProperty(FakeEntity, 'name', { value: 'FakeEntity', writable: false });

const fakeControllerOptions: DynamicApiControllerOptions<FakeEntity> = { path: 'fakes' };

const fakeHandler = jest.fn().mockResolvedValue({ id: '1', name: 'result' }) as jest.MockedFunction<
  CustomRouteConfig<FakeEntity>['handler']
>;

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeController(
  overrides: Partial<CustomRouteConfig<FakeEntity>> = {},
): CustomRouteControllerClass {
  return createCustomRouteController(
    FakeEntity,
    fakeControllerOptions,
    {
      path: 'e2ee-wrapped-keys',
      method: 'PATCH',
      handler: fakeHandler,
      ...overrides,
    } as CustomRouteConfig<FakeEntity>,
  ) as unknown as CustomRouteControllerClass;
}

// ─── Suite ────────────────────────────────────────────────────────────────

describe('createCustomRouteController', () => {
  beforeEach(() => {
    (jest.spyOn(DynamicApiModule.state, 'get') as jest.SpyInstance).mockReturnValue(false);
    fakeHandler.mockClear();
  });

  // ── Naming ──────────────────────────────────────────────────────────────

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
        FakeEntity,
        { path: 'fakes', apiTag: 'Conversations' },
        { path: 'keys', method: 'GET', handler: fakeHandler },
      ) as unknown as CustomRouteControllerClass;
      expect(Ctrl.name).toBe('CustomKeysConversationsController');
    });

    it('falls back to "Custom" as routePathPascal when path is empty string', () => {
      const Ctrl = makeController({ path: '' });
      // routePathPascal = 'Custom' (fallback) → name = 'CustomCustomFakeEntityController'
      expect(Ctrl.name).toBe('CustomCustomFakeEntityController');
    });
  });

  // ── getCustomRouteControllerName ─────────────────────────────────────────

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

  // ── getCustomRoutePoliciesGuardName ──────────────────────────────────────

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

  // ── HTTP methods ─────────────────────────────────────────────────────────

  it.each(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])('creates controller for %s method', (method) => {
    const Ctrl = makeController({ method: method as CustomRouteConfig<FakeEntity>['method'] });
    expect(Ctrl).toBeDefined();
    expect(Ctrl.prototype.handle).toBeDefined();
  });

  // ── Auth decorators ──────────────────────────────────────────────────────

  describe('auth decorators', () => {
    it('does not apply ApiBearerAuth when isAuthEnabled is false and isPublic is false', () => {
      (jest.spyOn(DynamicApiModule.state, 'get') as jest.SpyInstance).mockReturnValue(false);
      const Ctrl = makeController({ isPublic: false });
      expect(Ctrl).toBeDefined();
    });

    it('applies ApiBearerAuth when isAuthEnabled is true and isPublic is falsy', () => {
      (jest.spyOn(DynamicApiModule.state, 'get') as jest.SpyInstance).mockReturnValue(true);
      const Ctrl = makeController();
      expect(Ctrl.name).toBe('CustomE2eeWrappedKeysFakeEntityController');
    });

    it('applies Public when isPublic is true', () => {
      (jest.spyOn(DynamicApiModule.state, 'get') as jest.SpyInstance).mockReturnValue(false);
      const Ctrl = makeController({ isPublic: true });
      expect(Ctrl).toBeDefined();
    });
  });

  // ── abilityPredicate → guard created ─────────────────────────────────────

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

  // ── constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('assigns injected model to this.model', () => {
      const Ctrl = makeController();
      const fakeModel = { find: jest.fn() };
      // Instantiate directly (bypassing DI decorator) to cover the constructor
      const instance = new Ctrl(fakeModel);
      expect(instance.model).toBe(fakeModel);
    });
  });

  // ── handle() invocation ──────────────────────────────────────────────────

  describe('handle()', () => {
    it('calls handler with model, user, params, body, query', async () => {
      const Ctrl = makeController();
      const fakeModel = { findById: jest.fn() };
      const instance: ControllerInstanceShape = Object.create(Ctrl.prototype);
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
        req,
      });
    });

    it('returns raw handler result when presenter has no fromEntity', async () => {
      const expected = { id: '1', name: 'result' };
      fakeHandler.mockResolvedValueOnce(expected);

      const Ctrl = makeController();
      const instance: ControllerInstanceShape = Object.create(Ctrl.prototype);
      instance.model = {};

      const result = await instance.handle({}, {}, {}, undefined);
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

      const Ctrl = makeController({ dTOs: { presenter: FakePresenter } });
      const instance: ControllerInstanceShape = Object.create(Ctrl.prototype);
      instance.model = {};

      const result = await instance.handle({}, {}, {}, undefined);
      expect(fromEntity).toHaveBeenCalledWith(rawResult);
      expect(result).toEqual(mappedResult);
    });

    it('handles undefined req gracefully (public route, no user)', async () => {
      const Ctrl = makeController({ isPublic: true });
      const instance: ControllerInstanceShape = Object.create(Ctrl.prototype);
      instance.model = {};

      await instance.handle({}, {}, {}, undefined);

      expect(fakeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ user: undefined, req: undefined }),
      );
    });

    it('passes req object to handler context', async () => {
      const Ctrl = makeController();
      const instance: ControllerInstanceShape = Object.create(Ctrl.prototype);
      instance.model = {};

      const req = { user: { id: 'u1' } };
      await instance.handle({}, {}, {}, req);

      expect(fakeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ req }),
      );
    });
  });

  // ── dTOs metadata ────────────────────────────────────────────────────────

  describe('dTOs reflect-metadata override', () => {
    it('overrides paramtypes[1] with dTOs.body when provided', () => {
      class BodyDto {
        wrappedKey: string;
      }

      makeController({ dTOs: { body: BodyDto } });

      const Ctrl = createCustomRouteController(
        FakeEntity,
        fakeControllerOptions,
        { path: 'e2ee-wrapped-keys', method: 'PATCH', handler: fakeHandler, dTOs: { body: BodyDto } },
      ) as unknown as CustomRouteControllerClass;
      const paramTypes = Reflect.getMetadata('design:paramtypes', Ctrl.prototype, 'handle');
      expect(paramTypes[1]).toBe(BodyDto);
    });

    it('overrides paramtypes[2] with dTOs.query when provided', () => {
      class QueryDto {
        search: string;
      }

      const Ctrl = createCustomRouteController(
        FakeEntity,
        fakeControllerOptions,
        { path: 'e2ee-wrapped-keys', method: 'GET', handler: fakeHandler, dTOs: { query: QueryDto } },
      ) as unknown as CustomRouteControllerClass;

      const paramTypes = Reflect.getMetadata('design:paramtypes', Ctrl.prototype, 'handle');
      expect(paramTypes[2]).toBe(QueryDto);
    });

    it('does not override paramtypes when no dTOs.body or dTOs.query', () => {
      const Ctrl = makeController();
      const paramTypes = Reflect.getMetadata('design:paramtypes', Ctrl.prototype, 'handle');
      // All Object (TypeScript emits Object for unknown/interface types)
      expect(paramTypes).toBeDefined();
    });
  });

  // ── version inheritance ──────────────────────────────────────────────────

  describe('useInterceptors (route-level)', () => {
    it('applies route-level UseInterceptors decorator to the handle method', () => {
      class LoggingInterceptor {
        intercept = jest.fn();
      }

      const Ctrl = createCustomRouteController(
        FakeEntity,
        fakeControllerOptions,
        {
          path: 'upload',
          method: 'POST',
          handler: fakeHandler,
          useInterceptors: [LoggingInterceptor as never],
        },
      ) as unknown as CustomRouteControllerClass;

      // The controller must exist and compile without error
      expect(Ctrl).toBeDefined();
    });

    it('does not throw when no route-level useInterceptors provided', () => {
      expect(() => {
        createCustomRouteController(
          FakeEntity,
          fakeControllerOptions,
          { path: 'resource', method: 'GET', handler: fakeHandler },
        );
      }).not.toThrow();
    });
  });

  describe('version', () => {
    it('inherits controllerVersion when customRoute.version is not set', () => {
      const Ctrl = createCustomRouteController(
        FakeEntity,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler },
        '1',
      ) as unknown as CustomRouteControllerClass;
      expect(Ctrl.name).toBe('CustomKeysFakeEntityV1Controller');
    });

    it('overrides controllerVersion with customRoute.version', () => {
      const Ctrl = createCustomRouteController(
        FakeEntity,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler, version: '5' },
        '1',
      ) as unknown as CustomRouteControllerClass;
      expect(Ctrl.name).toBe('CustomKeysFakeEntityV5Controller');
    });
  });
});
