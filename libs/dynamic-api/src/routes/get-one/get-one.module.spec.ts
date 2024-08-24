import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as GetOneHelpers from './get-one.helper';
import { GetOneModule } from './get-one.module';

jest.mock('./get-one.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('GetOneModule', () => {
  let spyCreateGetOneController: jest.SpyInstance;
  let spyCreateGetOneServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';

  beforeEach(() => {
    spyCreateGetOneController = jest.spyOn(GetOneHelpers, 'createGetOneController').mockReturnValue(FakeController);
    spyCreateGetOneServiceProvider = jest.spyOn(GetOneHelpers, 'createGetOneServiceProvider').mockReturnValue(FakeServiceProvider);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = GetOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: GetOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateGetOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateGetOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
    });
  });
});
