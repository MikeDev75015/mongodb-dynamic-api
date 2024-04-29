import { Schema } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { DynamicApiGlobalStateService } from './dynamic-api-global-state.service';

describe('DynamicApiGlobalStateService', () => {
  let service: DynamicApiGlobalStateService;

  it('should init with default values', () => {
    service = new DynamicApiGlobalStateService();

    expect(service['_']).toStrictEqual(service['defaultGlobalState']);
    expect(service['_'].jwtSecret).toBeUndefined();
  });

  it('should init with initial values', () => {
    service = new DynamicApiGlobalStateService({ jwtSecret: 'secret' });

    expect(service['_']).not.toStrictEqual(service['defaultGlobalState']);
    expect(service['_'].jwtSecret).toBe('secret');
  });

  it('should return all state', () => {
    service = new DynamicApiGlobalStateService();

    expect(service.get()).toStrictEqual(service['_']);
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

  describe('addEntitySchema', () => {
    it('should add entity schema', () => {
      const schema = {} as Schema;
      DynamicApiGlobalStateService.addEntitySchema('User', schema);

      expect(DynamicApiGlobalStateService['entitySchemas$'].value.User).toBe(schema);
    });
  });

  describe('getEntitySchema', () => {
    it('should get entity schema', () => {
      const schema = {} as Schema;
      DynamicApiGlobalStateService.addEntitySchema('User', schema);

      expect(DynamicApiGlobalStateService.getEntitySchema('User')).toBe(schema);
    });

    it('should throw error if entity schema not found', () => {
      expect(() => DynamicApiGlobalStateService.getEntitySchema('Test')).toThrow(
        new Error(`Entity schema for "Test" not found`)
      );
    });
  });
});
