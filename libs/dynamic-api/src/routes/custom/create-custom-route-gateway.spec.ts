import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';
import { createMock } from '@test-helpers';
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
import { CustomRouteCallbackService } from './custom-route-callback.service';

vi.mock('../../mixins', () => ({
  SocketPoliciesGuardMixin: vi.fn().mockImplementation(() => {
    class FakeSocketPoliciesGuard {
      canActivate() { return true; }
    }
    return FakeSocketPoliciesGuard;
  }),
}));

// ─── Local interfaces ──────────────────────────────────────────────────────

interface GatewayInstanceShape {
  model: unknown;
  moduleRef?: { get: Mock };
  callbackService?: CustomRouteCallbackService<FakeEntity>;
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

const fakeHandler = vi.fn().mockResolvedValue({ id: '1', name: 'result' }) as MockedFunction<
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
  const model = { findById: vi.fn() };
  instance.model = model;
  // Object.create bypasses the real constructor (deliberately, to isolate handle() from
  // DI/decorator concerns) — callbackService (normally built in the constructor) needs to be
  // set by hand, same as model already is.
  instance.callbackService = new CustomRouteCallbackService(model as never);
  return instance;
}

// ─── Suite ────────────────────────────────────────────────────────────────

describe('createCustomRouteGateway', () => {
  beforeEach(() => {
    (vi.spyOn(DynamicApiModule.state, 'get') as Mock).mockReturnValue('test-connection');
    fakeHandler.mockClear();
    (SocketPoliciesGuardMixin as Mock).mockClear();
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
      instance.callbackService = new CustomRouteCallbackService({} as never);
      fakeHandler.mockResolvedValueOnce({ id: '1' });
      const result = await instance.handle({} as ExtendedSocket<FakeEntity>, {});
      expect(result.event).toBe('custom-keys-conversations');
    });
  });

  // ── handle() invocation ──────────────────────────────────────────────────

  describe('handle()', () => {
    it('calls handler with model, user from socket, empty params and query, body', async () => {
      const fakeModel = { findById: vi.fn() };
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
        methods: instance.callbackService!.getCallbackMethods(),
      }, []);
      expect(result.data).toEqual(expected);
    });

    it('handles undefined/null socket user (public route)', async () => {
      const instance = makeInstance({ isPublic: true });
      fakeHandler.mockResolvedValueOnce({ done: true });
      const result = await instance.handle({ user: undefined } as ExtendedSocket<FakeEntity>, {});
      expect(fakeHandler).toHaveBeenCalledWith(expect.objectContaining({ user: undefined }), []);
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
      const fromEntity = vi.fn().mockReturnValue(mapped);

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

  // ── inject (DI resolution) ────────────────────────────────────────────────

  describe('inject', () => {
    class FakeMailService {}

    it('resolves each inject token via moduleRef.get({ strict: false }) and passes the results to handler', async () => {
      const instance = makeInstance({ inject: [FakeMailService] });
      const fakeMailInstance = new FakeMailService();
      instance.moduleRef = { get: vi.fn().mockReturnValue(fakeMailInstance) };

      await instance.handle({} as ExtendedSocket<FakeEntity>, {});

      expect(instance.moduleRef.get).toHaveBeenCalledWith(FakeMailService, { strict: false });
      expect(fakeHandler).toHaveBeenCalledWith(expect.anything(), [fakeMailInstance]);
    });

    it('never touches moduleRef when inject is not provided', async () => {
      const instance = makeInstance();
      instance.moduleRef = { get: vi.fn() };

      await instance.handle({} as ExtendedSocket<FakeEntity>, {});

      expect(instance.moduleRef.get).not.toHaveBeenCalled();
      expect(fakeHandler).toHaveBeenCalledWith(expect.anything(), []);
    });
  });

  // ── abilityPredicate ─────────────────────────────────────────────────────

  describe('abilityPredicate', () => {
    it('calls SocketPoliciesGuardMixin when abilityPredicate is provided', () => {
      const predicate = vi.fn().mockReturnValue(true);
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
      const predicate = vi.fn().mockReturnValue(true);
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

  // ── authAbilityPredicate → guard created even without abilityPredicate ────

  describe('authAbilityPredicate', () => {
    it('calls SocketPoliciesGuardMixin when only authAbilityPredicate is provided (no abilityPredicate)', () => {
      const authAbilityPredicate = vi.fn().mockReturnValue(true);
      makeGateway({ authAbilityPredicate });

      expect(SocketPoliciesGuardMixin).toHaveBeenCalledWith(
        FakeEntity,
        'Custom',
        'custom-e2ee-wrapped-keys-fake-entity',
        undefined,
        { abilityPredicate: undefined, isPublic: undefined, predicateBehavior: undefined, authAbilityPredicate },
      );
    });
  });

  // ── constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('assigns injected model to this.model', () => {
      const GW = makeGateway();
      const fakeModel = { find: vi.fn() };
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

