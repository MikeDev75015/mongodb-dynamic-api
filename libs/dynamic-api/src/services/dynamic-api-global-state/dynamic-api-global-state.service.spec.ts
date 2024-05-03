import mongoose, { Model, Schema } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { DynamicApiGlobalStateService } from './dynamic-api-global-state.service';

describe('DynamicApiGlobalStateService', () => {
  let service: DynamicApiGlobalStateService;
  class User {}

  it('should init with default values', () => {
    service = new DynamicApiGlobalStateService();

    expect(DynamicApiGlobalStateService['_']).toStrictEqual(service['defaultGlobalState']);
    expect(DynamicApiGlobalStateService['_'].jwtSecret).toBeUndefined();
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
      DynamicApiGlobalStateService.addEntitySchema(User, schema);

      expect(DynamicApiGlobalStateService['entitySchemas$'].value.User).toBe(schema);
    });
  });

  describe('getEntitySchema', () => {
    it('should get entity schema', async () => {
      const fakeModel = {} as Model<any>;
      const fakeConnection = { model: jest.fn().mockReturnValue(fakeModel) } as unknown as mongoose.Connection;
      jest.spyOn(mongoose, 'createConnection').mockReturnValue({ asPromise: jest.fn().mockResolvedValue(fakeConnection) } as any);

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
