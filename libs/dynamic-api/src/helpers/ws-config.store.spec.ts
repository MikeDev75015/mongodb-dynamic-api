import { DynamicApiWsConfigStore } from './ws-config.store';

describe('DynamicApiWsConfigStore', () => {
  afterEach(() => {
    DynamicApiWsConfigStore.reset();
  });

  it('should have default values', () => {
    expect(DynamicApiWsConfigStore.debug).toBe(false);
    expect(DynamicApiWsConfigStore.onConnection).toBeUndefined();
    expect(DynamicApiWsConfigStore.jwtSecret).toBeUndefined();
  });

  it('should store and retrieve onConnection', () => {
    const handler = jest.fn();
    DynamicApiWsConfigStore.onConnection = handler;

    expect(DynamicApiWsConfigStore.onConnection).toBe(handler);
  });

  it('should store and retrieve debug', () => {
    DynamicApiWsConfigStore.debug = true;

    expect(DynamicApiWsConfigStore.debug).toBe(true);
  });

  it('should store and retrieve jwtSecret', () => {
    DynamicApiWsConfigStore.jwtSecret = 'my-secret';

    expect(DynamicApiWsConfigStore.jwtSecret).toBe('my-secret');
  });

  it('should reset all values', () => {
    DynamicApiWsConfigStore.debug = true;
    DynamicApiWsConfigStore.jwtSecret = 'secret';
    DynamicApiWsConfigStore.onConnection = jest.fn();

    DynamicApiWsConfigStore.reset();

    expect(DynamicApiWsConfigStore.debug).toBe(false);
    expect(DynamicApiWsConfigStore.onConnection).toBeUndefined();
    expect(DynamicApiWsConfigStore.jwtSecret).toBeUndefined();
  });
});

