import { Type } from '@nestjs/common';
import { buildDynamicApiModuleOptionsMock } from '../../__mocks__/dynamic-api.module.mock';
import { RouteType } from '../interfaces';
import { RouteDecoratorsBuilder } from './route-decorators.builder';

describe('RouteDecoratorsBuilder', () => {
  let routeDecoratorsBuilder: RouteDecoratorsBuilder<any>;
  let entity: Type;
  const fakeParam: Type = class FakeParam {
    id = '';
  };
  const fakeBody: Type = class FakeBody {
    name: string;
  };

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    routeDecoratorsBuilder = new RouteDecoratorsBuilder(
      'FakeRouteType' as RouteType,
      entity,
      undefined,
    );
  });

  describe('build', () => {
    it('should throw an error if the route type is unexpected', () => {
      expect(() => routeDecoratorsBuilder.build()).toThrowError(
        `Unexpected route type! Cannot build route decorators. Received: FakeRouteType`,
      );
    });

    test.each([
      ['GetMany', undefined, undefined, undefined, undefined, undefined, 3],
      ['GetOne', undefined, fakeParam, undefined, undefined, undefined, 4],
      ['CreateOne', undefined, undefined, undefined, fakeBody, undefined, 4],
      ['UpdateOne', undefined, fakeParam, undefined, undefined, undefined, 4],
      ['ReplaceOne', undefined, fakeParam, undefined, undefined, undefined, 4],
      ['DuplicateOne', 'test', fakeParam, undefined, undefined, undefined, 4],
      ['DeleteOne', undefined, fakeParam, undefined, undefined, undefined, 4],
    ])(
      'should return an array of route decorators for %s',
      (
        routeType,
        description,
        param: Type,
        query: Type,
        body: Type,
        presenter: Type,
        expectedLength: number,
      ) => {
        routeDecoratorsBuilder = new RouteDecoratorsBuilder(
          routeType as RouteType,
          entity,
          description,
          param,
          query,
          body,
          presenter,
        );
        const decorators = routeDecoratorsBuilder.build();

        expect(Array.isArray(decorators)).toBe(true);
        expect(decorators.length).toBe(expectedLength);
      },
    );
  });
});
