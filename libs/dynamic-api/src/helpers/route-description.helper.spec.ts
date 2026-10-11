import { describe, expect, it } from 'vitest';
import { RouteType } from '../interfaces';
import { getDefaultRouteDescription } from './route-description.helper';

describe('RouteDescriptionHelper', () => {
  describe('getDefaultRouteDescription', () => {
    it.each<[RouteType, string]>([
      ['CreateMany', 'Create many entity'],
      ['CreateOne', 'Create one entity'],
      ['DeleteMany', 'Delete many entity'],
      ['DeleteOne', 'Delete one entity'],
      ['DuplicateMany', 'Duplicate many entity'],
      ['DuplicateOne', 'Duplicate one entity'],
      ['GetMany', 'Get many entity'],
      ['GetOne', 'Get one entity by id'],
      ['ReplaceOne', 'Replace one entity'],
      ['UpdateMany', 'Update many entity'],
      ['UpdateOne', 'Update one entity'],
      ['Aggregate', 'Get aggregated entity'],
      ['Custom', 'Custom entity endpoint'],
    ])('should return default description for %s', (routeType, expected) => {
      expect(getDefaultRouteDescription(routeType, 'Entity')).toBe(expected);
    });

    it('should throw an error for unsupported route type', () => {
      expect(() => getDefaultRouteDescription('FakeRouteType' as unknown as RouteType, 'Entity'))
      .toThrowError('Route type "FakeRouteType" is not supported');
    });
  });
});
