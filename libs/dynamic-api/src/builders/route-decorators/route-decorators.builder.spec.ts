import { Type } from '@nestjs/common';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { DynamicApiModule } from '../../dynamic-api.module';
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
      ['GetMany', undefined, undefined, undefined, undefined, undefined, undefined, 4],
      ['GetOne', undefined, undefined, undefined, fakeParam, undefined, undefined, 5],
      ['GetOne', 'sub', undefined, undefined, fakeParam, undefined, undefined, 5],
      ['CreateMany', undefined, undefined, undefined, undefined, fakeManyBody, undefined, 4],
      ['CreateMany', 'sub', undefined, undefined, undefined, fakeManyBody, undefined, 4],
      ['CreateOne', undefined, undefined, undefined, undefined, fakeBody, undefined, 4],
      ['UpdateMany', undefined, '2', undefined, undefined, undefined, undefined, 3],
      ['UpdateOne', undefined, undefined, undefined, fakeParam, undefined, undefined, 4],
      ['UpdateOne', 'sub', undefined, undefined, fakeParam, undefined, undefined, 4],
      ['ReplaceOne', undefined, undefined, undefined, fakeParam, undefined, undefined, 4],
      ['ReplaceOne', 'sub', undefined, undefined, fakeParam, undefined, undefined, 4],
      ['DuplicateMany', undefined, undefined, 'test', undefined, undefined, undefined, 3],
      ['DuplicateMany', 'sub', undefined, 'test', undefined, undefined, undefined, 3],
      ['DuplicateOne', undefined, undefined, 'test', fakeParam, undefined, undefined, 4],
      ['DuplicateOne', 'sub', undefined, 'test', fakeParam, undefined, undefined, 4],
      ['DeleteMany', undefined, '1', undefined, undefined, undefined, undefined, 3],
      ['DeleteOne', undefined, undefined, undefined, fakeParam, undefined, undefined, 4],
      ['DeleteOne', 'sub', undefined, undefined, fakeParam, undefined, undefined, 4],
      ['Aggregate', undefined, undefined, undefined, undefined, undefined, undefined, 3],
    ])(
      'should return an array of route decorators for %s',
      (
        routeType,
        subPath,
        version,
        description,
        param: Type,
        body: Type,
        presenter: Type,
        expectedLength: number,
      ) => {
        if (routeType === 'GetOne') {
          DynamicApiModule.state.set(['isAuthEnabled', true]);
        } else {
          DynamicApiModule.state.set(['isAuthEnabled', false]);
        }

        routeDecoratorsBuilder = new RouteDecoratorsBuilder(
          routeType as RouteType,
          entity,
          subPath,
          version,
          description,
          routeType === 'GetMany',
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
