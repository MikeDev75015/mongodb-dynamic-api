import { applyDecorators, Type } from '@nestjs/common';
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

  const fakePresenter: Type = class FakeAggregatePresenter {};

  const fakePaginatedPresenter: Type = class FakePaginatedAggregatePresenter {
    static fromAggregate = () => ({});
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
      ['Aggregate', undefined, undefined, undefined, undefined, undefined, fakePresenter, 3],
      ['Aggregate', undefined, undefined, undefined, undefined, undefined, fakePaginatedPresenter, 4],
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

    describe('Aggregate route Swagger response shape', () => {
      // `@nestjs/swagger`'s own metadata keys — not exported publicly, mirrored here to read back
      // what `ApiResponse`/`ApiExtraModels` actually wrote (see `@nestjs/swagger/dist/constants`).
      const API_RESPONSE_METADATA_KEY = 'swagger/apiResponse';
      const API_EXTRA_MODELS_METADATA_KEY = 'swagger/apiExtraModels';

      // Mirrors what `RouteDecoratorsHelper` does at runtime: apply the built decorators to a
      // real method so `@nestjs/swagger` writes its metadata the same way it would in the app.
      const applyToDummyMethod = (decorators: (ClassDecorator | MethodDecorator)[]) => {
        class DummyController {
          @applyDecorators(...decorators)
          method() {}
        }

        return DummyController.prototype.method;
      };

      it('should document a plain presenter response for a non-paginated Aggregate route', () => {
        routeDecoratorsBuilder = new RouteDecoratorsBuilder(
          'Aggregate',
          entity,
          undefined,
          undefined,
          undefined,
          undefined,
          { presenter: fakePresenter },
        );

        const method = applyToDummyMethod(routeDecoratorsBuilder.build());
        const responseMetadata = Reflect.getMetadata(API_RESPONSE_METADATA_KEY, method);

        expect(responseMetadata.default.type).toBe(fakePresenter);
        expect(Reflect.getMetadata(API_EXTRA_MODELS_METADATA_KEY, method)).toBeUndefined();
      });

      it('should document a { list, count, totalPage } wrapper when the presenter has fromAggregate', () => {
        routeDecoratorsBuilder = new RouteDecoratorsBuilder(
          'Aggregate',
          entity,
          undefined,
          undefined,
          undefined,
          undefined,
          { presenter: fakePaginatedPresenter },
        );

        const method = applyToDummyMethod(routeDecoratorsBuilder.build());
        const responseMetadata = Reflect.getMetadata(API_RESPONSE_METADATA_KEY, method);
        const wrapperType = responseMetadata.default.type;

        expect(wrapperType).not.toBe(fakePaginatedPresenter);
        expect(wrapperType.name).toBe(`Paginated${fakePaginatedPresenter.name}`);
        expect(Reflect.getMetadata(API_EXTRA_MODELS_METADATA_KEY, method)).toEqual([
          fakePaginatedPresenter,
        ]);
      });
    });
  });
});
