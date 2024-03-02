import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { buildDynamicApiModuleOptionsMock } from '../__mocks__/dynamic-api.module.mock';
import { DynamicApiModule } from './dynamic-api.module';
import { DynamicAPISchemaOptionsInterface, RouteConfig, RouteType } from './interfaces';
import {
  CreateManyModule,
  CreateOneModule,
  DeleteOneModule,
  DuplicateOneModule,
  GetManyModule,
  GetOneModule,
  ReplaceOneModule,
  UpdateOneModule,
} from './modules';

describe('DynamicApiModule', () => {
  beforeEach(() => {
    jest.spyOn(MongooseModule, 'forRoot').mockReturnValue(null);
    jest.spyOn(MongooseModule, 'forFeature').mockReturnValue(null);
  });

  describe('forRoot', () => {
    it('should throw an error if no uri or invalid is provided', () => {
      expect(() => DynamicApiModule.forRoot('')).toThrowError(
        'You must provide a valid mongodb uri in the forRoot method to use MongoDB Dynamic API',
      );
    });

    it('should call MongooseModule.forRoot with uri and DynamicApiModule.connectionName', () => {
      const uri = 'fake-uri';
      DynamicApiModule.forRoot(uri);

      expect(MongooseModule.forRoot).toHaveBeenCalledWith(uri, {
        connectionName: DynamicApiModule.connectionName,
      });
    });
  });

  describe('forFeature', () => {
    let defaultOptions: ReturnType<typeof buildDynamicApiModuleOptionsMock>;
    const fakeDatabaseModule = { module: 'fake-database-module' };

    beforeEach(() => {
      defaultOptions = buildDynamicApiModuleOptionsMock();
      jest
      .spyOn(MongooseModule, 'forFeature')
      .mockReturnValue(fakeDatabaseModule as any);
    });

    it('should call MongooseModule.forFeature with DynamicApiModule.connectionName', () => {
      const { entity, controllerOptions, routes } = defaultOptions;

      const module = DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(MongooseModule.forFeature).toHaveBeenCalledWith(
        [{ name: entity.name, schema: expect.any(Object) }],
        DynamicApiModule.connectionName,
      );
      expect(module.imports.length).toStrictEqual(8);
    });

    it('should add schema indexes', () => {
      const fakeSchema = { index: jest.fn() };
      jest
      .spyOn(SchemaFactory, 'createForClass')
      .mockReturnValue(fakeSchema as any);
      const indexes = [
        { fields: { name: 1 }, options: { unique: true } },
        { fields: { age: -1 } },
      ];
      const options = buildDynamicApiModuleOptionsMock({}, {
        indexes,
      } as DynamicAPISchemaOptionsInterface);

      DynamicApiModule.forFeature(options);

      expect(fakeSchema.index).toHaveBeenNthCalledWith(
        1,
        { name: 1 },
        { unique: true },
      );
      expect(fakeSchema.index).toHaveBeenNthCalledWith(
        2,
        { age: -1 },
        undefined,
      );
    });

    it('should add schema hooks', () => {
      const fakeSchema = { pre: jest.fn() };
      jest
      .spyOn(SchemaFactory, 'createForClass')
      .mockReturnValue(fakeSchema as any);
      const hooks = [{ type: 'save', method: 'pre', callback: jest.fn() }];
      const options = buildDynamicApiModuleOptionsMock({}, {
        hooks,
      } as DynamicAPISchemaOptionsInterface);

      DynamicApiModule.forFeature(options);

      expect(fakeSchema.pre).toHaveBeenNthCalledWith(
        1,
        'save',
        { document: true, query: true },
        expect.any(Function),
      );
    });

    it('should throw an error if route type is not implemented', () => {
      const options = buildDynamicApiModuleOptionsMock({
        routes: [{ type: 'FakeType' as RouteType }],
      });

      expect(() => DynamicApiModule.forFeature(options)).toThrowError(
        'Route for FakeType is not implemented',
      );
    });

    it('should import route modules', () => {
      const spyCreateManyModule = jest.spyOn(CreateManyModule, 'forFeature');
      const createManyRoute: RouteConfig<any> = { type: 'CreateMany' };
      const spyCreateOneModule = jest.spyOn(CreateOneModule, 'forFeature');
      const createOneRoute: RouteConfig<any> = { type: 'CreateOne' };
      const spyDeleteOneModule = jest.spyOn(DeleteOneModule, 'forFeature');
      const deleteOneRoute: RouteConfig<any> = { type: 'DeleteOne' };
      const spyDuplicateOneModule = jest.spyOn(
        DuplicateOneModule,
        'forFeature',
      );
      const duplicateOneRoute: RouteConfig<any> = { type: 'DuplicateOne' };
      const spyGetManyModule = jest.spyOn(GetManyModule, 'forFeature');
      const getManyRoute: RouteConfig<any> = { type: 'GetMany' };
      const spyGetOneModule = jest.spyOn(GetOneModule, 'forFeature');
      const getOneRoute: RouteConfig<any> = { type: 'GetOne' };
      const spyReplaceOneModule = jest.spyOn(ReplaceOneModule, 'forFeature');
      const replaceOneRoute: RouteConfig<any> = { type: 'ReplaceOne' };
      const spyUpdateOneModule = jest.spyOn(UpdateOneModule, 'forFeature');
      const updateOneRoute: RouteConfig<any> = { type: 'UpdateOne' };

      const options = buildDynamicApiModuleOptionsMock({
        routes: [
          createManyRoute,
          createOneRoute,
          deleteOneRoute,
          duplicateOneRoute,
          getManyRoute,
          getOneRoute,
          replaceOneRoute,
          updateOneRoute,
        ],
      });

      const module = DynamicApiModule.forFeature(options);

      expect(module.imports.length).toStrictEqual(8);
      expect(spyCreateManyModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        createOneRoute.description,
        createOneRoute.dTOs,
        createManyRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyCreateOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        createOneRoute.description,
        createOneRoute.dTOs,
        createOneRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyDeleteOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        deleteOneRoute.description,
        deleteOneRoute.dTOs,
        deleteOneRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyDuplicateOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        duplicateOneRoute.description,
        duplicateOneRoute.dTOs,
        duplicateOneRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyGetManyModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        getManyRoute.description,
        getManyRoute.dTOs,
        getManyRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyGetOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        getOneRoute.description,
        getOneRoute.dTOs,
        getOneRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyReplaceOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        replaceOneRoute.description,
        replaceOneRoute.dTOs,
        replaceOneRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
      expect(spyUpdateOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        updateOneRoute.description,
        updateOneRoute.dTOs,
        updateOneRoute.validationPipeOptions ?? options.controllerOptions.validationPipeOptions,
      );
    });
  });
});
