import { getDefaultRouteDescription } from './route-description.helper';

describe('RouteDescriptionHelper', () => {
  describe('getDefaultRouteDescription', () => {
    it('should return default description for GetMany', () => {
      expect(getDefaultRouteDescription('GetMany', 'Entity')).toBe('Get many entity');
    });

    it('should return default description for GetOne', () => {
      expect(getDefaultRouteDescription('GetOne', 'Entity')).toBe('Get one entity by id');
    });

    it('should return default description for CreateMany', () => {
      expect(getDefaultRouteDescription('CreateMany', 'Entity')).toBe('Create many entity');
    });

    it('should return default description for CreateOne', () => {
      expect(getDefaultRouteDescription('CreateOne', 'Entity')).toBe('Create one entity');
    });

    it('should return default description for ReplaceOne', () => {
      expect(getDefaultRouteDescription('ReplaceOne', 'Entity')).toBe('Replace one entity');
    });

    it('should return default description for UpdateOne', () => {
      expect(getDefaultRouteDescription('UpdateOne', 'Entity')).toBe('Update one entity');
    });

    it('should return default description for DuplicateOne', () => {
      expect(getDefaultRouteDescription('DuplicateOne', 'Entity')).toBe('Duplicate one entity');
    });

    it('should return default description for DeleteOne', () => {
      expect(getDefaultRouteDescription('DeleteOne', 'Entity')).toBe('Delete one entity');
    });

    it('should throw an error for unsupported route type', () => {
      expect(() => getDefaultRouteDescription('FakeRouteType' as any, 'Entity'))
      .toThrowError('Route type "FakeRouteType" is not supported');
    });
  });
});
