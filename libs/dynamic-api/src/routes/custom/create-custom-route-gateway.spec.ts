import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { DynamicApiModule } from '../../dynamic-api.module';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { BaseEntity } from '../../models';
import { SocketPoliciesGuardMixin } from '../../mixins';
import {
  CustomRouteConfig,
  DynamicApiControllerOptions,
  ExtendedSocket,
} from '../../interfaces';
import {
  createCustomRouteGateway,
  getCustomRouteGatewayName,
} from './create-custom-route-gateway';

jest.mock('../../mixins', () => ({
  SocketPoliciesGuardMixin: jest.fn().mockImplementation(() => {
    class FakeSocketPoliciesGuard {
      canActivate() { return true; }
    }
    return FakeSocketPoliciesGuard;
  }),
}));

// ─── Local interfaces ──────────────────────────────────────────────────────

interface GatewayInstanceShape {
  model: unknown;
  handle: (
    socket: ExtendedSocket<FakeEntity>,
    body: unknown,
  ) => Promise<{ event: string; data: unknown }>;
}

interface CustomRouteGatewayClass {
  new (model: unknown, jwtService: JwtService): GatewayInstanceShape;
  readonly name: string;
  readonly prototype: GatewayInstanceShape;
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

const jwtService = createMock<JwtService>();

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeGateway(
  overrides: Partial<CustomRouteConfig<FakeEntity>> = {},
): CustomRouteGatewayClass {
  return createCustomRouteGateway(
    FakeEntity,
    fakeControllerOptions,
    {
      path: 'e2ee-wrapped-keys',
      method: 'PATCH',
      handler: fakeHandler,
      webSocket: true,
      ...overrides,
    } as CustomRouteConfig<FakeEntity>,
  ) as unknown as CustomRouteGatewayClass;
}

function makeInstance(overrides: Partial<CustomRouteConfig<FakeEntity>> = {}): GatewayInstanceShape {
  const Gateway = makeGateway(overrides);
  const instance = Object.create(Gateway.prototype) as GatewayInstanceShape;
  instance.model = { findById: jest.fn() };
  return instance;
}

// ─── Suite ────────────────────────────────────────────────────────────────

describe('createCustomRouteGateway', () => {
  beforeEach(() => {
    (jest.spyOn(DynamicApiModule.state, 'get') as jest.SpyInstance).mockReturnValue('test-connection');
    fakeHandler.mockClear();
    (SocketPoliciesGuardMixin as jest.Mock).mockClear();
  });

  // ── Naming ──────────────────────────────────────────────────────────────

  describe('gateway name', () => {
    it('uses Custom + pascal(path) + entityName + Gateway', () => {
      const GW = makeGateway();
      expect(GW.name).toBe('CustomE2eeWrappedKeysFakeEntityGateway');
    });

    it('appends version suffix when version is set', () => {
      const GW = makeGateway({ version: '2' });
      expect(GW.name).toBe('CustomE2eeWrappedKeysFakeEntityV2Gateway');
    });

    it('uses apiTag instead of entityName when provided', () => {
      const GW = createCustomRouteGateway(
        FakeEntity,
        { path: 'fakes', apiTag: 'Conversations' },
        { path: 'keys', method: 'GET', handler: fakeHandler, webSocket: true },
      ) as unknown as CustomRouteGatewayClass;
      expect(GW.name).toBe('CustomKeysConversationsGateway');
    });

    it('falls back to "Custom" as routePathPascal when path is empty string', () => {
      const GW = makeGateway({ path: '' });
      expect(GW.name).toBe('CustomCustomFakeEntityGateway');
    });
  });

  // ── getCustomRouteGatewayName ────────────────────────────────────────────

  describe('getCustomRouteGatewayName', () => {
    it('returns correct name without version', () => {
      expect(getCustomRouteGatewayName('FakeEntity', 'e2ee-wrapped-keys')).toBe(
        'CustomE2eeWrappedKeysFakeEntityGateway',
      );
    });

    it('returns correct name with version', () => {
      expect(getCustomRouteGatewayName('FakeEntity', 'e2ee-wrapped-keys', undefined, '3')).toBe(
        'CustomE2eeWrappedKeysFakeEntityV3Gateway',
      );
    });

    it('uses apiTag when provided', () => {
      expect(getCustomRouteGatewayName('FakeEntity', 'keys', 'Conversations')).toBe(
        'CustomKeysConversationsGateway',
      );
    });

    it('uses "Custom" fallback when path is empty', () => {
      expect(getCustomRouteGatewayName('FakeEntity', '')).toBe('CustomCustomFakeEntityGateway');
    });
  });

  // ── extends BaseGateway ──────────────────────────────────────────────────

  it('should return a class that extends BaseGateway', () => {
    const GW = makeGateway();
    expect(GW.prototype).toBeInstanceOf(BaseGateway);
  });

  // ── event name ──────────────────────────────────────────────────────────

  describe('event name', () => {
    it('generates auto event kebabCase(custom/path/entityName)', async () => {
      const instance = makeInstance();
      fakeHandler.mockResolvedValueOnce({ id: '1' });
      const result = await instance.handle({} as ExtendedSocket<FakeEntity>, {});
      expect(result.event).toBe('custom-e2ee-wrapped-keys-fake-entity');
    });

    it('uses custom eventName when provided', async () => {
      const instance = makeInstance({ eventName: 'my-custom-event' });
      fakeHandler.mockResolvedValueOnce({ id: '1' });
      const result = await instance.handle({} as ExtendedSocket<FakeEntity>, {});
      expect(result.event).toBe('my-custom-event');
    });

    it('uses apiTag in auto event name when provided', async () => {
      const GW = createCustomRouteGateway(
        FakeEntity,
        { path: 'fakes', apiTag: 'Conversations' },
        { path: 'keys', method: 'GET', handler: fakeHandler, webSocket: true },
      ) as unknown as CustomRouteGatewayClass;
      const instance = Object.create(GW.prototype) as GatewayInstanceShape;
      instance.model = {};
      fakeHandler.mockResolvedValueOnce({ id: '1' });
      const result = await instance.handle({} as ExtendedSocket<FakeEntity>, {});
      expect(result.event).toBe('custom-keys-conversations');
    });
  });

  // ── handle() invocation ──────────────────────────────────────────────────

  describe('handle()', () => {
    it('calls handler with model, user from socket, empty params and query, body', async () => {
      const fakeModel = { findById: jest.fn() };
      const instance = makeInstance();
      instance.model = fakeModel;

      const fakeUser = { id: 'user-1' };
      const socket = { user: fakeUser } as unknown as ExtendedSocket<FakeEntity>;
      const body = { wrappedKey: 'key123' };
      const expected = { id: '1', name: 'result' };
      fakeHandler.mockResolvedValueOnce(expected);

      const result = await instance.handle(socket, body);

      expect(fakeHandler).toHaveBeenCalledWith({
        model: fakeModel,
        user: fakeUser,
        params: {},
        body,
        query: {},
      });
      expect(result.data).toEqual(expected);
    });

    it('handles undefined/null socket user (public route)', async () => {
      const instance = makeInstance({ isPublic: true });
      fakeHandler.mockResolvedValueOnce({ done: true });
      const result = await instance.handle({ user: undefined } as ExtendedSocket<FakeEntity>, {});
      expect(fakeHandler).toHaveBeenCalledWith(expect.objectContaining({ user: undefined }));
      expect(result.data).toEqual({ done: true });
    });

    it('returns raw handler result when presenter has no fromEntity', async () => {
      const expected = { id: '1', name: 'raw' };
      fakeHandler.mockResolvedValueOnce(expected);
      const instance = makeInstance();
      const result = await instance.handle({} as ExtendedSocket<FakeEntity>, {});
      expect(result.data).toEqual(expected);
    });

    it('maps result through presenter.fromEntity when present', async () => {
      const raw = { id: '2', name: 'raw' } as unknown as FakeEntity;
      const mapped = { id: '2', displayName: 'mapped' };
      const fromEntity = jest.fn().mockReturnValue(mapped);

      class FakePresenter {
        static fromEntity = fromEntity;
      }

      fakeHandler.mockResolvedValueOnce(raw);
      const instance = makeInstance({ dTOs: { presenter: FakePresenter } });
      const result = await instance.handle({} as ExtendedSocket<FakeEntity>, {});

      expect(fromEntity).toHaveBeenCalledWith(raw);
      expect(result.data).toEqual(mapped);
    });
  });

  // ── abilityPredicate ─────────────────────────────────────────────────────

  describe('abilityPredicate', () => {
    it('calls SocketPoliciesGuardMixin when abilityPredicate is provided', () => {
      const predicate = jest.fn().mockReturnValue(true);
      makeGateway({ abilityPredicate: predicate });

      expect(SocketPoliciesGuardMixin).toHaveBeenCalledWith(
        FakeEntity,
        'Custom',
        'custom-e2ee-wrapped-keys-fake-entity',
        undefined,
        { abilityPredicate: predicate, isPublic: undefined, predicateBehavior: undefined },
      );
    });

    it('passes predicateBehavior to SocketPoliciesGuardMixin', () => {
      const predicate = jest.fn().mockReturnValue(true);
      makeGateway({ abilityPredicate: predicate, predicateBehavior: 'filter' });

      expect(SocketPoliciesGuardMixin).toHaveBeenCalledWith(
        FakeEntity,
        'Custom',
        'custom-e2ee-wrapped-keys-fake-entity',
        undefined,
        { abilityPredicate: predicate, isPublic: undefined, predicateBehavior: 'filter' },
      );
    });

    it('does not call SocketPoliciesGuardMixin when no abilityPredicate', () => {
      makeGateway();
      expect(SocketPoliciesGuardMixin).not.toHaveBeenCalled();
    });
  });

  // ── constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('assigns injected model to this.model', () => {
      const GW = makeGateway();
      const fakeModel = { find: jest.fn() };
      const instance = new GW(fakeModel, jwtService);
      expect(instance.model).toBe(fakeModel);
    });
  });

  // ── version inheritance ──────────────────────────────────────────────────

  describe('version', () => {
    it('inherits controllerVersion when customRoute.version is not set', () => {
      const GW = createCustomRouteGateway(
        FakeEntity,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler, webSocket: true },
        '1',
      ) as unknown as CustomRouteGatewayClass;
      expect(GW.name).toBe('CustomKeysFakeEntityV1Gateway');
    });

    it('overrides controllerVersion with customRoute.version', () => {
      const GW = createCustomRouteGateway(
        FakeEntity,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler, webSocket: true, version: '5' },
        '1',
      ) as unknown as CustomRouteGatewayClass;
      expect(GW.name).toBe('CustomKeysFakeEntityV5Gateway');
    });
  });

  // ── gatewayOptions forwarded ──────────────────────────────────────────────

  it('creates gateway without throwing when custom gatewayOptions are provided', () => {
    expect(() =>
      createCustomRouteGateway(
        FakeEntity,
        fakeControllerOptions,
        { path: 'keys', method: 'GET', handler: fakeHandler, webSocket: true },
        undefined,
        undefined,
        { namespace: '/custom', cors: { origin: '*' } },
      ),
    ).not.toThrow();
  });
});

