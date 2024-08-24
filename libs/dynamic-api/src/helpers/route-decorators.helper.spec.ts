import { buildDynamicApiModuleOptionsMock } from '../../__mocks__/dynamic-api.module.mock';
import { RouteDecoratorsBuilder } from '../builders';
import { RouteDecoratorsHelper } from './route-decorators.helper';

describe('RouteDecoratorsHelper', () => {
  it('should build and apply decorators', () => {
    const { entity } = buildDynamicApiModuleOptionsMock();
    const routeDecorators = new RouteDecoratorsBuilder(
      'DeleteOne',
      entity,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    const spyBuild = jest.spyOn(routeDecorators, 'build');

    RouteDecoratorsHelper(routeDecorators);

    expect(spyBuild).toHaveBeenCalled();
  });
});
