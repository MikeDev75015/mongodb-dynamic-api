import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanActivate, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DynamicApiModule } from '../../dynamic-api.module';
import { MongoDBDynamicApiLogger } from '../../logger/mongo-dynamic-api.logger';
import { CachePurgePresenter, createCachePurgeController, resolveCachePurgeOptions } from './cache-purge.helper';

class FakeEntity {}
Object.defineProperty(FakeEntity, 'name', { value: 'FakeEntity', writable: false });

describe('createCachePurgeController', () => {
  beforeEach(() => {
    vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false);
  });

  it('should create a controller class with the correct name', () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );
    expect(Controller.name).toBe('CachePurgeFakeEntityController');
  });

  it('should create a controller class with version in name', () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes', version: '1' } as any,
    );
    expect(Controller.name).toBe('CachePurgeFakeEntityV1Controller');
  });

  it('should create a controller with apiTag in name if provided', () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes', apiTag: 'CustomTag' } as any,
    );
    expect(Controller.name).toBe('CachePurgeCustomTagController');
  });

  it('should inject the cache service', () => {
    const Controller = createCachePurgeController(FakeEntity as any, { path: 'fakes' } as any);
    const cacheService = { invalidate: vi.fn() };

    expect(new Controller(cacheService)).toHaveProperty('cacheService', cacheService);
  });

  it('should have a purgeCache method', () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );
    expect(Controller.prototype.purgeCache).toBeDefined();
  });

  it('purgeCache should call cacheService.invalidate(entity) and return { purged: true }', async () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );
    const mockInvalidate = vi.fn().mockResolvedValue(undefined);
    const instance = Object.create(Controller.prototype);
    instance.cacheService = { invalidate: mockInvalidate };

    const result = await instance.purgeCache();

    expect(mockInvalidate).toHaveBeenCalledWith(FakeEntity);
    expect(result).toEqual({ purged: true });
  });

  it('should apply Public decorator when isPublic is true', () => {
    vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false);

    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes', isPublic: true } as any,
    );

    expect(Controller).toBeDefined();
    expect(Controller.name).toBe('CachePurgeFakeEntityController');
  });

  it('should apply ApiBearerAuth decorator when isAuthEnabled is true and isPublic is falsy', () => {
    vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);

    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );

    expect(Controller).toBeDefined();
    expect(Controller.name).toBe('CachePurgeFakeEntityController');
  });

  describe('authAbilityPredicate', () => {
    const getGuards = (Controller: Type): Type<CanActivate>[] | undefined =>
      Reflect.getMetadata(GUARDS_METADATA, Controller.prototype.purgeCache);

    const buildContext = (user: unknown) => ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as ExecutionContext;

    it('should not add a guard when no predicate is given', () => {
      const Controller = createCachePurgeController(FakeEntity as any, { path: 'fakes' } as any);

      expect(getGuards(Controller)).toBeUndefined();
    });

    it('should add a guard that allows a user accepted by the predicate', () => {
      const predicate = vi.fn().mockReturnValue(true);
      const Controller = createCachePurgeController(FakeEntity as any, { path: 'fakes' } as any, predicate);
      const [Guard] = getGuards(Controller);
      const user = { id: '1' };

      expect(new Guard().canActivate(buildContext(user))).toBe(true);
      expect(predicate).toHaveBeenCalledWith(user);
    });

    it.each([
      ['the predicate rejects the user', { id: '1' }],
      ['there is no user', undefined],
    ])('should throw ForbiddenException when %s', (_, user) => {
      const Controller = createCachePurgeController(
        FakeEntity as any,
        { path: 'fakes' } as any,
        vi.fn().mockReturnValue(false),
      );
      const [Guard] = getGuards(Controller);

      expect(() => new Guard().canActivate(buildContext(user))).toThrow(ForbiddenException);
    });
  });

  describe('boot warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(MongoDBDynamicApiLogger.prototype, 'warn').mockImplementation(() => undefined);
    });

    it('should warn when auth is enabled and the route has no predicate and is not public', () => {
      vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);

      createCachePurgeController(FakeEntity as any, { path: 'fakes' } as any);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DELETE /fakes/cache on FakeEntity'));
    });

    it.each([
      ['auth is disabled', false, {}, undefined],
      ['the route is public', true, { isPublic: true }, undefined],
      ['a predicate is set', true, {}, () => true],
    ])('should not warn when %s', (_, isAuthEnabled, extraOptions, predicate) => {
      vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(isAuthEnabled);

      createCachePurgeController(FakeEntity as any, { path: 'fakes', ...extraOptions } as any, predicate);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('CachePurgePresenter', () => {
  it('should be instantiable', () => {
    expect(new CachePurgePresenter()).toBeInstanceOf(CachePurgePresenter);
  });
});

describe('resolveCachePurgeOptions', () => {
  const globalPredicate = () => true;
  const featurePredicate = () => false;

  it.each([
    ['nothing is set', undefined, undefined, { enabled: true, authAbilityPredicate: undefined }],
    ['global is false', false, undefined, { enabled: false, authAbilityPredicate: undefined }],
    ['feature is false', { authAbilityPredicate: globalPredicate }, false, { enabled: false, authAbilityPredicate: globalPredicate }],
    ['feature re-enables a globally disabled route', false, { enabled: true }, { enabled: true, authAbilityPredicate: undefined }],
    ['only global has a predicate', { authAbilityPredicate: globalPredicate }, {}, { enabled: true, authAbilityPredicate: globalPredicate }],
    ['feature overrides the global predicate', { authAbilityPredicate: globalPredicate }, { authAbilityPredicate: featurePredicate }, { enabled: true, authAbilityPredicate: featurePredicate }],
  ])('should resolve when %s', (_, globalOptions, featureOptions, expected) => {
    expect(resolveCachePurgeOptions(globalOptions, featureOptions)).toStrictEqual(expected);
  });
});
