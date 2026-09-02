import { describe, expect, it, vi } from 'vitest';
import { resolveBroadcast } from './resolve-broadcast.helper';
import { BroadcastConfig } from '../interfaces';

interface Item {
  id: string;
  ownerId?: string;
}

describe('resolveBroadcast', () => {
  const data: Item[] = [{ id: '1' }, { id: '2' }];

  it('should return undefined when broadcastConfig is not provided', () => {
    expect(resolveBroadcast('event', data, undefined)).toBeUndefined();
  });

  it('should return undefined when data is empty', () => {
    expect(resolveBroadcast('event', [], { enabled: true })).toBeUndefined();
  });

  it('should return undefined when data is null-ish', () => {
    expect(resolveBroadcast('event', null as unknown as Item[], { enabled: true })).toBeUndefined();
  });

  it('should return undefined when enabled is false', () => {
    expect(resolveBroadcast('event', data, { enabled: false })).toBeUndefined();
  });

  it('should resolve with all data when enabled is true', () => {
    expect(resolveBroadcast('event', data, { enabled: true })).toEqual({
      event: 'event',
      rooms: undefined,
      data,
    });
  });

  it('should filter data using the enabled predicate', () => {
    const predicate = (item: Item) => item.id === '1';

    expect(resolveBroadcast('event', data, { enabled: predicate })).toEqual({
      event: 'event',
      rooms: undefined,
      data: [{ id: '1' }],
    });
  });

  it('should return undefined when the enabled predicate filters out every item', () => {
    const predicate = () => false;

    expect(resolveBroadcast('event', data, { enabled: predicate })).toBeUndefined();
  });

  it('should pass the user to the enabled predicate', () => {
    const predicate = vi.fn((item: Item, user?: { id: string }) => item.ownerId === user?.id);
    const user = { id: '1' };
    const scoped: Item[] = [{ id: 'a', ownerId: '1' }, { id: 'b', ownerId: '2' }];

    const result = resolveBroadcast('event', scoped, { enabled: predicate }, user);

    expect(predicate).toHaveBeenCalledWith(scoped[0], user);
    expect(predicate).toHaveBeenCalledWith(scoped[1], user);
    expect(result?.data).toEqual([{ id: 'a', ownerId: '1' }]);
  });

  it('should use the default event when eventName is not set', () => {
    expect(resolveBroadcast('default-event', data, { enabled: true })?.event).toBe('default-event');
  });

  it('should use broadcastConfig.eventName when set', () => {
    expect(resolveBroadcast('default-event', data, { enabled: true, eventName: 'custom-event' })?.event)
      .toBe('custom-event');
  });

  it('should resolve static rooms', () => {
    expect(resolveBroadcast('event', data, { enabled: true, rooms: 'room-a' })?.rooms).toEqual(['room-a']);
  });

  it('should resolve dynamic rooms with the user', () => {
    const user = { id: 'user-1' };
    const roomsFn = vi.fn((item: Item, u?: { id: string }) => `${item.id}-${u?.id}`);
    const config: BroadcastConfig<Item, { id: string }> = { enabled: true, rooms: roomsFn };

    const result = resolveBroadcast('event', data, config, user);

    expect(roomsFn).toHaveBeenCalledWith(data[0], user);
    expect(result?.rooms).toEqual(['1-user-1', '2-user-1']);
  });

  it('should leave rooms undefined when not configured', () => {
    expect(resolveBroadcast('event', data, { enabled: true })?.rooms).toBeUndefined();
  });
});
