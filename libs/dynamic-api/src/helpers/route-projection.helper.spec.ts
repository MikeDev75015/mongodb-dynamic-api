import { describe, expect, it, vi } from 'vitest';
import { resolveRouteProjection } from './route-projection.helper';

class Lobby {
  name: string;
  strokes: number[];
}

describe('resolveRouteProjection', () => {
  const user = { id: 'userId' };

  it('should return undefined when no projection is configured', () => {
    expect(resolveRouteProjection<Lobby>(undefined, user)).toBeUndefined();
  });

  it.each([
    ['an object', { strokes: 0 }],
    ['a string', 'name'],
  ])('should return a static projection given as %s unchanged', (_, projection) => {
    expect(resolveRouteProjection<Lobby>(projection, user)).toBe(projection);
  });

  it('should call a projection function with the user and return its result', () => {
    const projection = vi.fn(() => ({ strokes: 0 }));

    expect(resolveRouteProjection<Lobby>(projection, user)).toStrictEqual({ strokes: 0 });
    expect(projection).toHaveBeenCalledWith(user);
  });
});
