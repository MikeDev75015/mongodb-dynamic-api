import {
  CreateOneModule,
  DEFAULT_BDD_CONNECTION_NAME,
  DeleteOneModule,
  DuplicateOneModule,
  DynamicApiModule,
  DynamicAPISchemaOptionsInterface,
  GetManyModule,
  GetOneModule,
  ReplaceOneModule,
  RouteConfig,
  RouteType,
  UpdateOneModule,
} from '@dynamic-api';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { buildDynamicApiModuleOptionsMock } from '../__mocks__/dynamic-api.module.mock';

describe('DynamicApiModule', () => {
  beforeEach(() => {
    jest.spyOn(MongooseModule, 'forRoot').mockReturnValue(null);
    jest.spyOn(MongooseModule, 'forFeature').mockReturnValue(null);
    process.env.BBD_CONNECTION_NAME = 'fake-connection-name';
  });

  describe('forRoot', () => {
    it('should throw an error if no uri and no env variables', () => {
      process.env.BDD_URL = '';
      process.env.BDD_BASE = '';

      expect(() => DynamicApiModule.forRoot()).toThrowError(
        'You must provide a mongodbUri or set the BDD_URL and BDD_BASE environment variables',
      );
    });

    it('should call MongooseModule.forRoot with uri', () => {
      const uri = 'fake-uri';
      process.env.BBD_CONNECTION_NAME = '';

      DynamicApiModule.forRoot(uri);

      expect(MongooseModule.forRoot).toHaveBeenCalledWith(uri, {
        connectionName: DEFAULT_BDD_CONNECTION_NAME,
      });
    });

    it('should call MongooseModule.forRoot with env variables', () => {
      process.env.BDD_URL = 'fake-url';
      process.env.BDD_BASE = 'fake-base';

      DynamicApiModule.forRoot();

      expect(MongooseModule.forRoot).toHaveBeenCalledWith(
        `${process.env.BDD_URL}/${process.env.BDD_BASE}?retryWrites=true&w=majority`,
        {
          connectionName: process.env.BBD_CONNECTION_NAME,
        },
      );
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

    it('should call MongooseModule.forFeature with DEFAULT_BDD_CONNECTION_NAME', () => {
      process.env.BBD_CONNECTION_NAME = '';
      const { entity, controllerOptions, routes } = defaultOptions;

      const module = DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(MongooseModule.forFeature).toHaveBeenCalledWith(
        [{ name: entity.name, schema: expect.any(Object) }],
        DEFAULT_BDD_CONNECTION_NAME,
      );
      expect(module.imports.length).toStrictEqual(0);
    });

    it('should call MongooseModule.forFeature with BBD_CONNECTION_NAME', () => {
      const { entity, controllerOptions, routes } = defaultOptions;

      const module = DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(MongooseModule.forFeature).toHaveBeenCalledWith(
        [{ name: entity.name, schema: expect.any(Object) }],
        process.env.BBD_CONNECTION_NAME,
      );
      expect(module.imports.length).toStrictEqual(0);
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

      expect(module.imports.length).toStrictEqual(7);
      expect(spyCreateOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        createOneRoute.description,
        createOneRoute.dTOs,
      );
      expect(spyDeleteOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        deleteOneRoute.description,
        deleteOneRoute.dTOs,
      );
      expect(spyDuplicateOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        duplicateOneRoute.description,
        duplicateOneRoute.dTOs,
      );
      expect(spyGetManyModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        getManyRoute.description,
        getManyRoute.dTOs,
      );
      expect(spyGetOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        getOneRoute.description,
        getOneRoute.dTOs,
      );
      expect(spyReplaceOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        replaceOneRoute.description,
        replaceOneRoute.dTOs,
      );
      expect(spyUpdateOneModule).toHaveBeenCalledWith(
        fakeDatabaseModule,
        options.entity,
        options.controllerOptions.path,
        options.controllerOptions.apiTag,
        options.controllerOptions.version,
        updateOneRoute.description,
        updateOneRoute.dTOs,
      );
    });
  });
});
