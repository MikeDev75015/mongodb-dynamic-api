import { RouteDecoratorsBuilder, RouteDecoratorsHelper } from '@dynamic-api';
import { buildDynamicApiModuleOptionsMock } from '../../../../test/__mocks__/dynamic-api.module.mock';

describe('RouteDecoratorsHelper', () => {
  it('should build and apply decorators', () => {
    const { entity } = buildDynamicApiModuleOptionsMock();
    const routeDecorators = new RouteDecoratorsBuilder('DeleteOne', entity);
    const spyBuild = jest.spyOn(routeDecorators, 'build');

    RouteDecoratorsHelper(routeDecorators);

    expect(spyBuild).toHaveBeenCalled();
  });
});
