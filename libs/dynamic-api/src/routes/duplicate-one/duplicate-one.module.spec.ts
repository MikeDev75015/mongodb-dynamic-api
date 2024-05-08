import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateOneModule } from './duplicate-one.module';
import * as DuplicateOneHelpers from './duplicate-one.helper';

jest.mock('./duplicate-one.helper');

class Entity extends BaseEntity {}

describe('DuplicateOneModule', () => {
  let spyCreateDuplicateOneController: jest.SpyInstance;
  let spyCreateDuplicateOneServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const routeConfigCallback = jest.fn();
  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DuplicateOne', callback: routeConfigCallback };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateDuplicateOneController = jest.spyOn(DuplicateOneHelpers, 'createDuplicateOneController').mockReturnValue(FakeController);
    spyCreateDuplicateOneServiceProvider = jest.spyOn(DuplicateOneHelpers, 'createDuplicateOneServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = DuplicateOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DuplicateOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateDuplicateOneController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDuplicateOneServiceProvider).toHaveBeenCalledWith(Entity, version, routeConfigCallback);
    });
  });
});
