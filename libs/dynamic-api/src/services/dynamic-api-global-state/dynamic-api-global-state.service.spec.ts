import { describe, expect, it, vi } from 'vitest';
import mongoose, { Model, Schema } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { DynamicApiGlobalStateService } from './dynamic-api-global-state.service';

// `vi.spyOn(mongoose, 'createConnection')` doesn't affect dynamic-api-global-state.service.ts's own
// named `import { createConnection } from 'mongoose'` under Vite's ESM/CJS interop (unlike Jest/CJS,
// where they're the same mutable reference) — mock the module itself instead, which both the default
// import here and the named import in the source resolve through identically.
vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>();
  const createConnection = vi.fn();
  // Both the named export (what the source imports) and the default export's own property (what
  // this spec's `import mongoose from 'mongoose'` reads) must point at the same mock — Vite's CJS
  // interop keeps them as distinct copies otherwise, unlike Jest/CJS where they're one reference.
  return { ...actual, createConnection, default: { ...actual.default, createConnection } };
});

describe('DynamicApiGlobalStateService', () => {
  let service: DynamicApiGlobalStateService;
  class User {}

  it('should init with default values', () => {
    service = new DynamicApiGlobalStateService();

    expect(DynamicApiGlobalStateService['_']).toStrictEqual(service['defaultGlobalState']);
    expect(DynamicApiGlobalStateService['_'].jwtSecret).toBeUndefined();
    expect(DynamicApiGlobalStateService['_'].jwtRefreshTokenExpiresIn).toBeUndefined();
    expect(DynamicApiGlobalStateService['_'].jwtRefreshSecret).toBeUndefined();
    expect(DynamicApiGlobalStateService['_'].jwtRefreshUseCookie).toBeUndefined();
  });

  it('should init with initial values', () => {
    service = new DynamicApiGlobalStateService({ jwtSecret: 'secret' });

    expect(DynamicApiGlobalStateService['_']).not.toStrictEqual(service['defaultGlobalState']);
    expect(DynamicApiGlobalStateService['_'].jwtSecret).toBe('secret');
  });

  it('should return all state', () => {
    service = new DynamicApiGlobalStateService();

    expect(service.get()).toStrictEqual(DynamicApiGlobalStateService['_']);
  });

  it('should set partial state', () => {
    const partialState = { jwtSecret: 'secret', isAuthEnabled: true };
    service = new DynamicApiGlobalStateService();
    service.set(['partial', partialState]);

    expect(service.get()).toStrictEqual({ ...service['defaultGlobalState'], ...partialState });
  });

  it('should get state property', () => {
    service = new DynamicApiGlobalStateService();

    expect(service.get('connectionName')).toBe(service['defaultGlobalState'].connectionName);
  });

  it('should set state property', () => {
    service = new DynamicApiGlobalStateService();

    service.set(['connectionName', 'new-connection-name']);
    expect(service.get('connectionName')).toBe('new-connection-name');
  });

  it('should reset state', () => {
    service = new DynamicApiGlobalStateService({ jwtSecret: 'secret' });
    service['resetState']();

    expect(service.get('jwtSecret')).toStrictEqual(undefined);
  });

  describe('onInitialized', () => {
    it('should return false by default', async () => {
      expect(await firstValueFrom(DynamicApiGlobalStateService.onInitialized())).toBe(false);
    });

    it('should return true after initialized', async () => {
      service = new DynamicApiGlobalStateService();
      service.set(['initialized', true]);

      expect(await firstValueFrom(DynamicApiGlobalStateService.onInitialized())).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should read a value off the shared static state without instantiating the service', () => {
      service = new DynamicApiGlobalStateService();
      service.set(['isGlobalCacheEnabled', false]);

      expect(DynamicApiGlobalStateService.getValue('isGlobalCacheEnabled')).toBe(false);
    });

    it('should default cacheKeyBy to url+identity', () => {
      service = new DynamicApiGlobalStateService();

      expect(DynamicApiGlobalStateService.getValue('cacheKeyBy')).toBe('url+identity');
    });
  });

  describe('addEntitySchema', () => {
    it('should add entity schema', () => {
      const schema = {} as Schema;
      DynamicApiGlobalStateService.addEntitySchema(User, schema);

      expect(DynamicApiGlobalStateService['entitySchemas$'].value.User).toBe(schema);
    });
  });

  describe('getEntitySchema', () => {
    it('should get entity schema', async () => {
      const fakeModel = {} as Model<any>;
      const fakeConnection = { model: vi.fn().mockReturnValue(fakeModel) } as unknown as mongoose.Connection;
      vi.mocked(mongoose.createConnection).mockReturnValue({ asPromise: vi.fn().mockResolvedValue(fakeConnection) } as unknown as ReturnType<typeof mongoose.createConnection>);

      const fakeSchema = {} as Schema;
      DynamicApiGlobalStateService.addEntitySchema(User, fakeSchema);

      await expect(DynamicApiGlobalStateService.getEntityModel(User)).resolves.toBe(fakeModel);
    });

    it('should throw error if entity schema not found', async () => {
      class Test {}

      await expect(() => DynamicApiGlobalStateService.getEntityModel(Test)).rejects.toThrow(
        new Error(`Entity schema for "Test" not found`)
      );
    });
  });
});
