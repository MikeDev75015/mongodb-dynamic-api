import { resolveRooms } from './resolve-rooms.helper';

describe('resolveRooms', () => {
  describe('when rooms is undefined', () => {
    it('should return undefined', () => {
      expect(resolveRooms(undefined, [{ id: '1' }])).toBeUndefined();
    });
  });

  describe('when rooms is a static string', () => {
    it('should return an array with the single room', () => {
      expect(resolveRooms('my-room', [{ id: '1' }])).toEqual(['my-room']);
    });

    it('should deduplicate (single string trivially unique)', () => {
      expect(resolveRooms('my-room', [])).toEqual(['my-room']);
    });
  });

  describe('when rooms is a static string[]', () => {
    it('should return the array as-is when unique', () => {
      expect(resolveRooms(['room-a', 'room-b'], [{ id: '1' }])).toEqual(['room-a', 'room-b']);
    });

    it('should deduplicate duplicate entries', () => {
      expect(resolveRooms(['room-a', 'room-a', 'room-b'], [])).toEqual(['room-a', 'room-b']);
    });
  });

  describe('when rooms is a function', () => {
    it('should call the function for each item and flatten the results', () => {
      const data = [
        { id: '1', companyId: 'company-a' },
        { id: '2', companyId: 'company-b' },
      ];
      const roomsFn = (item: { id: string; companyId: string }) => item.companyId;

      expect(resolveRooms(roomsFn, data)).toEqual(['company-a', 'company-b']);
    });

    it('should deduplicate rooms resolved from multiple items', () => {
      const data = [
        { id: '1', companyId: 'company-a' },
        { id: '2', companyId: 'company-a' },
        { id: '3', companyId: 'company-b' },
      ];
      const roomsFn = (item: { id: string; companyId: string }) => item.companyId;

      expect(resolveRooms(roomsFn, data)).toEqual(['company-a', 'company-b']);
    });

    it('should flatten when the function returns an array', () => {
      const data = [
        { id: '1', tags: ['room-x', 'room-y'] },
        { id: '2', tags: ['room-y', 'room-z'] },
      ];
      const roomsFn = (item: { id: string; tags: string[] }) => item.tags;

      expect(resolveRooms(roomsFn, data)).toEqual(['room-x', 'room-y', 'room-z']);
    });

    it('should return an empty array when data is empty', () => {
      const roomsFn = (item: { id: string }) => item.id;

      expect(resolveRooms(roomsFn, [])).toEqual([]);
    });
  });
});

