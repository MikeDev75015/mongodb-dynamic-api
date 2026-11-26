import { describe, expect, it, vi } from 'vitest';
import { presentCustomRouteResult } from './present-custom-route-result.helper';

interface Lobby {
  id: string;
}

describe('presentCustomRouteResult', () => {
  const user = { id: 'userId' };
  const lobby: Lobby = { id: '1' };
  const lobbies: Lobby[] = [{ id: '1' }, { id: '2' }];

  describe('single response', () => {
    it.each([[undefined], [false]])('returns the raw result when the presenter has no fromEntity (isArrayResponse: %s)', (flag) => {
      expect(presentCustomRouteResult<Lobby>({}, lobby, user, flag)).toBe(lobby);
    });

    it('maps the result through fromEntity', () => {
      const fromEntity = vi.fn().mockReturnValue({ mapped: true });

      expect(presentCustomRouteResult<Lobby>({ fromEntity }, lobby, user, false)).toStrictEqual({ mapped: true });
      expect(fromEntity).toHaveBeenCalledWith(lobby);
    });
  });

  describe('array response', () => {
    it('returns the raw list when the presenter has no mapper', () => {
      expect(presentCustomRouteResult<Lobby>({}, lobbies, user, true)).toBe(lobbies);
    });

    it('maps the list through fromEntities with the user, ignoring fromEntity', () => {
      const fromEntity = vi.fn();
      const fromEntities = vi.fn().mockReturnValue([{ mapped: 'all' }]);

      expect(presentCustomRouteResult<Lobby>({ fromEntity, fromEntities }, lobbies, user, true))
        .toStrictEqual([{ mapped: 'all' }]);
      expect(fromEntities).toHaveBeenCalledWith(lobbies, user);
      expect(fromEntity).not.toHaveBeenCalled();
    });

    it('falls back to fromEntity on every item when fromEntities is missing', () => {
      const fromEntity = vi.fn((entity: Lobby) => ({ mappedId: entity.id }));

      expect(presentCustomRouteResult<Lobby>({ fromEntity: fromEntity as never }, lobbies, user, true))
        .toStrictEqual([{ mappedId: '1' }, { mappedId: '2' }]);
      expect(fromEntity).toHaveBeenNthCalledWith(1, lobbies[0], user);
      expect(fromEntity).toHaveBeenNthCalledWith(2, lobbies[1], user);
    });
  });
});
