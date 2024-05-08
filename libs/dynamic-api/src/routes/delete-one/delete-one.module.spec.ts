import { DynamicModule, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneModule } from './delete-one.module';
import * as DeleteOneHelpers from './delete-one.helper';

jest.mock('./delete-one.helper');

class Entity extends BaseEntity {}

describe('DeleteOneModule', () => {
  let spyCreateDeleteOneController: jest.SpyInstance;
  let spyCreateDeleteOneServiceProvider: jest.SpyInstance;

  const FakeController = jest.fn();
  const FakeServiceProvider = { provide: 'fakeProvider' } as unknown as DynamicAPIServiceProvider;

  const databaseModule = { module: 'databaseModule' } as unknown as DynamicModule;
  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'fakePath' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteOne' };
  const version = 'fakeVersion';
  const validationPipeOptions: ValidationPipeOptions = { transform: true };

  beforeEach(() => {
    spyCreateDeleteOneController = jest.spyOn(DeleteOneHelpers, 'createDeleteOneController').mockReturnValue(FakeController);
    spyCreateDeleteOneServiceProvider = jest.spyOn(DeleteOneHelpers, 'createDeleteOneServiceProvider').mockReturnValue(FakeServiceProvider);
  });

  describe('forFeature', () => {
    it('should return a DynamicModule', () => {
      const result = DeleteOneModule.forFeature(databaseModule, Entity, controllerOptions, routeConfig, version, validationPipeOptions);

      expect(result).toEqual({
        module: DeleteOneModule,
        imports: [databaseModule],
        controllers: [FakeController],
        providers: [FakeServiceProvider],
      });

      expect(spyCreateDeleteOneController).toHaveBeenCalledWith(Entity, controllerOptions, routeConfig, version, validationPipeOptions);
      expect(spyCreateDeleteOneServiceProvider).toHaveBeenCalledWith(Entity, version);
    });
  });
});
