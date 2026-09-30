import { describe, expect, it, vi } from 'vitest';
import { Exclude } from 'class-transformer';
import { Types } from 'mongoose';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { resolveBroadcast } from './resolve-broadcast.helper';
import { BroadcastConfig } from '../interfaces';

interface Item {
  id: string;
  ownerId?: string;
}

describe('resolveBroadcast', () => {
  const data: Item[] = [{ id: '1' }, { id: '2' }];

  it('should serialize the emitted items so @Exclude() fields are never broadcast', () => {
    class UserItem {
      id: string;

      @Exclude()
      password: string;

      constructor(id: string, password: string) {
        this.id = id;
        this.password = password;
      }
    }
    const enabled = vi.fn().mockReturnValue(true);

    const result = resolveBroadcast('event', [new UserItem('1', 'hash')], { enabled });

    expect(result?.data).toStrictEqual([{ id: '1' }]);
    expect(enabled).toHaveBeenCalledWith(expect.any(UserItem), undefined);
  });

  describe('BSON values', () => {
    it('should emit every nested ObjectId as its hex string', () => {
      const id = new Types.ObjectId();
      const childId = new Types.ObjectId();
      const refId = new Types.ObjectId();

      const result = resolveBroadcast('event', [{ _id: id, children: [{ _id: childId }], ref: { ownerId: refId } }], { enabled: true });

      expect(result?.data).toStrictEqual([{
        _id: id.toHexString(),
        children: [{ _id: childId.toHexString() }],
        ref: { ownerId: refId.toHexString() },
      }]);
    });

    it('should emit a Decimal128 in its JSON form', () => {
      const result = resolveBroadcast('event', [{ price: Types.Decimal128.fromString('9.99') }], { enabled: true });

      expect(result?.data).toStrictEqual([{ price: { $numberDecimal: '9.99' } }]);
    });

    it('should keep applying @Exclude() on an entity instance carrying an ObjectId', () => {
      class Account {
        _id: Types.ObjectId;

        @Exclude()
        apiKey: string;

        constructor(_id: Types.ObjectId, apiKey: string) {
          this._id = _id;
          this.apiKey = apiKey;
        }
      }
      const id = new Types.ObjectId();
      const account = new Account(id, 'secret');

      const result = resolveBroadcast('event', [account], { enabled: true });

      expect(result?.data).toStrictEqual([{ _id: id.toHexString() }]);
      expect(account._id).toBe(id);
    });

    it('should leave dates, buffers, maps, sets and null values as they are', () => {
      const date = new Date('2026-09-30T00:00:00.000Z');
      const map = new Map([['a', 1]]);
      const set = new Set([1]);
      const item = { date, buffer: Buffer.from('ab'), map, set, empty: null, count: 1 };

      const result = resolveBroadcast('event', [item], { enabled: true });

      expect(result?.data[0]).toMatchObject({ empty: null, count: 1 });
      expect(result?.data[0]).toHaveProperty('date');
    });

    it('should copy an object without prototype', () => {
      const item = Object.assign(Object.create(null) as object, { _id: new Types.ObjectId() });

      const result = resolveBroadcast('event', [item], { enabled: true });

      expect(typeof (result?.data[0] as { _id: unknown })._id).toBe('string');
    });
  });

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
      authenticatedOnly: false,
    });
  });

  it('should filter data using the enabled predicate', () => {
    const predicate = (item: Item) => item.id === '1';

    expect(resolveBroadcast('event', data, { enabled: predicate })).toEqual({
      event: 'event',
      rooms: undefined,
      data: [{ id: '1' }],
      authenticatedOnly: false,
    });
  });

  describe('authenticatedOnly', () => {
    const mockAuthEnabled = (isAuthEnabled: boolean) => {
      vi.spyOn(DynamicApiGlobalStateService, 'getValue').mockReturnValue(isAuthEnabled as never);
    };

    it.each<[string, boolean, BroadcastConfig<Item>, boolean]>([
      ['auth enabled, no rooms', true, { enabled: true }, true],
      ['auth enabled, public', true, { enabled: true, public: true }, false],
      ['auth enabled, rooms set', true, { enabled: true, rooms: 'room-1' }, false],
      ['auth disabled', false, { enabled: true }, false],
    ])('should be %s → %s', (_, isAuthEnabled, config, expected) => {
      mockAuthEnabled(isAuthEnabled);

      expect(resolveBroadcast('event', data, config)?.authenticatedOnly).toBe(expected);
      vi.restoreAllMocks();
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
