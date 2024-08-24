import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import * as Helpers from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import * as ReplaceOneHelpers from './replace-one.helper';
import { ReplaceOneModule } from './replace-one.module';

jest.mock('./replace-one.helper');
jest.mock('../../helpers');

class Entity extends BaseEntity {}

describe('ReplaceOneModule', () => {
  let spyCreateReplaceOneController: jest.SpyInstance;
  let spyCreateReplaceOneServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'ReplaceOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };
  const fakeDisplayedName = 'FakeDisplayedName';

  beforeEach(() => {
    spyCreateReplaceOneController = jest.spyOn(ReplaceOneHelpers, 'createReplaceOneController').mockReturnValue(FakeController);
    spyCreateReplaceOneServiceProvider = jest.spyOn(ReplaceOneHelpers, 'createReplaceOneServiceProvider').mockReturnValue(FakeServiceProvider);
    jest.spyOn(Helpers, 'getDisplayedName').mockReturnValue(fakeDisplayedName);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = ReplaceOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: ReplaceOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateReplaceOneController)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateReplaceOneServiceProvider)
      .toHaveBeenCalledWith(Entity, fakeDisplayedName, version, routeConfigCallback);
    });
  });
});
