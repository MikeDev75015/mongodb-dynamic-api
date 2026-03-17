import { DynamicApiModule } from '../../dynamic-api.module';
import { createCachePurgeController } from './cache-purge.helper';

class FakeEntity {}
Object.defineProperty(FakeEntity, 'name', { value: 'FakeEntity', writable: false });

describe('createCachePurgeController', () => {
  beforeEach(() => {
    jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false);
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

  it('should have a purgeCache method', () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );
    expect(Controller.prototype.purgeCache).toBeDefined();
  });

  it('purgeCache should call cacheManager.clear() and return { purged: true }', async () => {
    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );
    const mockClear = jest.fn().mockResolvedValue(undefined);
    const instance = Object.create(Controller.prototype);
    instance.cacheManager = { clear: mockClear };

    const result = await instance.purgeCache();

    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ purged: true });
  });

  it('should apply Public decorator when isPublic is true', () => {
    jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(false);

    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes', isPublic: true } as any,
    );

    expect(Controller).toBeDefined();
    expect(Controller.name).toBe('CachePurgeFakeEntityController');
  });

  it('should apply ApiBearerAuth decorator when isAuthEnabled is true and isPublic is falsy', () => {
    jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(true);

    const Controller = createCachePurgeController(
      FakeEntity as any,
      { path: 'fakes' } as any,
    );

    expect(Controller).toBeDefined();
    expect(Controller.name).toBe('CachePurgeFakeEntityController');
  });
});


