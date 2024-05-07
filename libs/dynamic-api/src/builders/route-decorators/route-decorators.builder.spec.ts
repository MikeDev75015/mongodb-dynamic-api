import { Type } from '@nestjs/common';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { RouteType } from '../../interfaces';
import { RouteDecoratorsBuilder } from './route-decorators.builder';

describe('RouteDecoratorsBuilder', () => {
  let routeDecoratorsBuilder: RouteDecoratorsBuilder<any>;
  let entity: Type;

  const fakeParam: Type = class FakeParam {
    id = '';
  };

  class FakeBody {
    name: string;
  }
  const fakeBody: Type = FakeBody;
  const fakeManyBody: Type = class FakeManyBody {
    list: FakeBody[];
  };

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    routeDecoratorsBuilder = new RouteDecoratorsBuilder(
      'FakeRouteType' as RouteType,
      entity,
      undefined,
      undefined,
      undefined,
    );
  });

  describe('build', () => {
    it('should throw an error if the route type is unexpected', () => {
      expect(() => routeDecoratorsBuilder.build()).toThrow(
        new Error('Unexpected route type! Cannot build route decorators. Received: FakeRouteType'),
      );
    });

    test.each([
      ['GetMany', undefined, undefined, undefined, undefined, undefined, 3],
      ['GetOne', undefined, undefined, fakeParam, undefined, undefined, 4],
      ['CreateMany', undefined, undefined, undefined, fakeManyBody, undefined, 4],
      ['CreateOne', undefined, undefined, undefined, fakeBody, undefined, 4],
      ['UpdateMany', '2', undefined, undefined, undefined, undefined, 3],
      ['UpdateOne', undefined, undefined, fakeParam, undefined, undefined, 4],
      ['ReplaceOne', undefined, undefined, fakeParam, undefined, undefined, 4],
      ['DuplicateMany', undefined, 'test', undefined, undefined, undefined, 3],
      ['DuplicateOne', undefined, 'test', fakeParam, undefined, undefined, 4],
      ['DeleteMany', '1', undefined, undefined, undefined, undefined, 3],
      ['DeleteOne', undefined, undefined, fakeParam, undefined, undefined, 4],
    ])(
      'should return an array of route decorators for %s',
      (
        routeType,
        version,
        description,
        param: Type,
        body: Type,
        presenter: Type,
        expectedLength: number,
      ) => {
        routeDecoratorsBuilder = new RouteDecoratorsBuilder(
          routeType as RouteType,
          entity,
          version,
          description,
          false,
          {
            param,
            body,
            presenter,
          },
        );
        const decorators = routeDecoratorsBuilder.build();

        expect(Array.isArray(decorators)).toBe(true);
        expect(decorators.length).toBe(expectedLength);
      },
    );
  });
});
