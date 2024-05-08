import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyModule } from './delete-many.module';
import * as DeleteManyHelpers from './delete-many.helper';

jest.mock('./delete-many.helper');

class Entity extends BaseEntity {}

describe('DeleteManyModule', () => {
  let spyCreateDeleteManyController: jest.SpyInstance;
  let spyCreateDeleteManyServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteMany' };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateDeleteManyController = jest.spyOn(DeleteManyHelpers, 'createDeleteManyController').mockReturnValue(FakeController);
    spyCreateDeleteManyServiceProvider = jest.spyOn(DeleteManyHelpers, 'createDeleteManyServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = DeleteManyModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DeleteManyModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateDeleteManyController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDeleteManyServiceProvider).toHaveBeenCalledWith(Entity, version);
    });
  });
});
