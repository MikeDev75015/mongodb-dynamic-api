import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { buildDynamicApiModuleOptionsMock } from '../__mocks__/dynamic-api.module.mock';
import { DynamicApiModule } from './dynamic-api.module';
import { DynamicAPIRouteConfig, DynamicAPISchemaOptionsInterface, RouteType } from './interfaces';
import {
  CreateManyModule,
  CreateOneModule,
  DeleteManyModule,
  DeleteOneModule,
  DuplicateManyModule,
  DuplicateOneModule,
  GetManyModule,
  GetOneModule,
  ReplaceOneModule,
  UpdateManyModule,
  UpdateOneModule,
} from './routes';

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

    it('should have default connection name value', () => {
      expect(DynamicApiModule.connectionName).toStrictEqual('dynamic-api-connection');
    });

    it('should call MongooseModule.forRoot with uri and DynamicApiModule.connectionName', () => {
      const uri = 'fake-uri';
      DynamicApiModule.forRoot(uri);

      expect(MongooseModule.forRoot).toHaveBeenCalledWith(uri, {
        connectionName: DynamicApiModule.connectionName,
      });
    });

    describe('with cache', () => {
      let spyCacheModuleRegister: jest.SpyInstance;

      beforeEach(() => {
        spyCacheModuleRegister = jest.spyOn(CacheModule, 'register');
      });

      afterEach(() => {
        spyCacheModuleRegister.mockClear();
      });

      it('should register CacheModule globally by default', () => {
        const uri = 'fake-uri';
        const module = DynamicApiModule.forRoot(uri);

        expect(spyCacheModuleRegister).toHaveBeenCalledWith({ isGlobal: true });
        expect(module.imports.length).toStrictEqual(2);
      });

      it('should pass cacheOptions to CacheModule.register', () => {
        const uri = 'fake-uri';
        const cacheOptions = { max: 100 };
        DynamicApiModule.forRoot(uri, { cacheOptions });

        expect(spyCacheModuleRegister).toHaveBeenCalledWith({ isGlobal: true, ...cacheOptions });
      });

      it('should not register CacheModule globally if useGlobalCache is set to false', () => {
        const uri = 'fake-uri';
        const options = { useGlobalCache: false };
        const module = DynamicApiModule.forRoot(uri, options);

        expect(spyCacheModuleRegister).not.toHaveBeenCalled();
        expect(module.imports.length).toStrictEqual(1);
      });
    });
  });

  describe('forFeature', () => {
    let defaultOptions: ReturnType<typeof buildDynamicApiModuleOptionsMock>;
    const fakeDatabaseModule = { module: 'fake-database-module' };
    const fakeSchema = { index: jest.fn(), pre: jest.fn(), set: jest.fn() };

    beforeEach(() => {
      defaultOptions = buildDynamicApiModuleOptionsMock();
      jest
      .spyOn(SchemaFactory, 'createForClass')
      .mockReturnValue(fakeSchema as any);
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
      expect(module.imports.length).toStrictEqual(11);
    });

    it('should add schema indexes', () => {
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

    it('should throw an error if version not match a numeric string', () => {
      const options = buildDynamicApiModuleOptionsMock({
        controllerOptions: { path: '/version', version: 'v1' },
      });

      expect(() => DynamicApiModule.forFeature(options)).toThrowError(
        'Invalid version v1 for GetMany route. Version must be a string that matches numeric format, e.g. 1, 2, 3, ..., 99.',
      );
    });

    describe('with routes', () => {
      let spyCreateManyModule: jest.SpyInstance;
      let spyCreateOneModule: jest.SpyInstance;
      let spyDeleteManyModule: jest.SpyInstance;
      let spyDeleteOneModule: jest.SpyInstance;
      let spyDuplicateManyModule: jest.SpyInstance;
      let spyDuplicateOneModule: jest.SpyInstance;
      let spyGetManyModule: jest.SpyInstance;
      let spyGetOneModule: jest.SpyInstance;
      let spyReplaceOneModule: jest.SpyInstance;
      let spyUpdateManyModule: jest.SpyInstance;
      let spyUpdateOneModule: jest.SpyInstance;

      class fakeQuery {}

      class fakeParam {}

      class fakeBody {}

      class fakeManyBody {list: any[];}

      class fakePresenter {}

      beforeEach(() => {
        spyCreateManyModule = jest.spyOn(CreateManyModule, 'forFeature');
        spyCreateOneModule = jest.spyOn(CreateOneModule, 'forFeature');
        spyDeleteManyModule = jest.spyOn(DeleteManyModule, 'forFeature');
        spyDeleteOneModule = jest.spyOn(DeleteOneModule, 'forFeature');
        spyDuplicateManyModule = jest.spyOn(DuplicateManyModule, 'forFeature');
        spyDuplicateOneModule = jest.spyOn(DuplicateOneModule, 'forFeature');
        spyGetManyModule = jest.spyOn(GetManyModule, 'forFeature');
        spyGetOneModule = jest.spyOn(GetOneModule, 'forFeature');
        spyReplaceOneModule = jest.spyOn(ReplaceOneModule, 'forFeature');
        spyUpdateManyModule = jest.spyOn(UpdateManyModule, 'forFeature');
        spyUpdateOneModule = jest.spyOn(UpdateOneModule, 'forFeature');
      });

      it('should import route modules with controller options', () => {
        const createManyRoute: DynamicAPIRouteConfig<any> = { type: 'CreateMany' };
        const createOneRoute: DynamicAPIRouteConfig<any> = { type: 'CreateOne' };
        const deleteManyRoute: DynamicAPIRouteConfig<any> = { type: 'DeleteMany' };
        const deleteOneRoute: DynamicAPIRouteConfig<any> = { type: 'DeleteOne' };
        const duplicateManyRoute: DynamicAPIRouteConfig<any> = { type: 'DuplicateMany' };
        const duplicateOneRoute: DynamicAPIRouteConfig<any> = { type: 'DuplicateOne' };
        const getManyRoute: DynamicAPIRouteConfig<any> = { type: 'GetMany' };
        const getOneRoute: DynamicAPIRouteConfig<any> = { type: 'GetOne' };
        const replaceOneRoute: DynamicAPIRouteConfig<any> = { type: 'ReplaceOne' };
        const updateManyRoute: DynamicAPIRouteConfig<any> = { type: 'UpdateMany' };
        const updateOneRoute: DynamicAPIRouteConfig<any> = { type: 'UpdateOne' };

        const options = buildDynamicApiModuleOptionsMock({
          controllerOptions: { path: 'fake-path', version: '1', validationPipeOptions: { transform: true } },
          routes: [
            createManyRoute,
            createOneRoute,
            deleteManyRoute,
            deleteOneRoute,
            duplicateManyRoute,
            duplicateOneRoute,
            getManyRoute,
            getOneRoute,
            replaceOneRoute,
            updateManyRoute,
            updateOneRoute,
          ],
        });

        const module = DynamicApiModule.forFeature(options);

        expect(module.imports.length).toStrictEqual(11);
        expect(spyCreateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Create many person entity', ...createManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyCreateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Create one person entity', ...createOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyDeleteManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Delete many person entity', ...deleteManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyDeleteOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Delete one person entity', ...deleteOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyDuplicateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Duplicate many person entity', ...duplicateManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyDuplicateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Duplicate one person entity', ...duplicateOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyGetManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Get many person entity', ...getManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyGetOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Get one person entity by id', ...getOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyReplaceOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Replace one person entity', ...replaceOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyUpdateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Update many person entity', ...updateManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyUpdateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'Update one person entity', ...updateOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
      });

      it('should import route modules with route options', () => {
        const createManyRoute: DynamicAPIRouteConfig<any> = {
          type: 'CreateMany',
          description: 'Create many items',
          dTOs: { body: fakeManyBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const createOneRoute: DynamicAPIRouteConfig<any> = {
          type: 'CreateOne',
          description: 'Create one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const deleteManyRoute: DynamicAPIRouteConfig<any> = {
          type: 'DeleteMany',
          description: 'Delete many item',
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const deleteOneRoute: DynamicAPIRouteConfig<any> = {
          type: 'DeleteOne',
          description: 'Delete one item',
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const duplicateManyRoute: DynamicAPIRouteConfig<any> = {
          type: 'DuplicateMany',
          description: 'Duplicate many item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const duplicateOneRoute: DynamicAPIRouteConfig<any> = {
          type: 'DuplicateOne',
          description: 'Duplicate one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const getManyRoute: DynamicAPIRouteConfig<any> = {
          type: 'GetMany',
          description: 'Get many items',
          dTOs: { query: fakeQuery, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const getOneRoute: DynamicAPIRouteConfig<any> = {
          type: 'GetOne',
          description: 'Get one item',
          dTOs: { param: fakeParam, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const replaceOneRoute: DynamicAPIRouteConfig<any> = {
          type: 'ReplaceOne',
          description: 'Replace one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const updateManyRoute: DynamicAPIRouteConfig<any> = {
          type: 'UpdateMany',
          description: 'Update many item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const updateOneRoute: DynamicAPIRouteConfig<any> = {
          type: 'UpdateOne',
          description: 'Update one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };

        const options = buildDynamicApiModuleOptionsMock({
          controllerOptions: {
            path: 'fake-path',
            apiTag: 'Tag',
            version: '1',
            validationPipeOptions: { transform: true },
          },
          routes: [
            createManyRoute,
            createOneRoute,
            deleteManyRoute,
            deleteOneRoute,
            duplicateManyRoute,
            duplicateOneRoute,
            getManyRoute,
            getOneRoute,
            replaceOneRoute,
            updateManyRoute,
            updateOneRoute,
          ],
        });

        const module = DynamicApiModule.forFeature(options);

        expect(module.imports.length).toStrictEqual(11);
        expect(spyCreateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          createManyRoute,
          createManyRoute.version,
          createManyRoute.validationPipeOptions,
        );
        expect(spyCreateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          createOneRoute,
          createOneRoute.version,
          createOneRoute.validationPipeOptions,
        );
        expect(spyDeleteOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          deleteOneRoute,
          deleteOneRoute.version,
          deleteOneRoute.validationPipeOptions,
        );
        expect(spyDeleteManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          deleteManyRoute,
          deleteManyRoute.version,
          deleteManyRoute.validationPipeOptions,
        );
        expect(spyDuplicateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          duplicateManyRoute,
          duplicateManyRoute.version,
          duplicateManyRoute.validationPipeOptions,
        );
        expect(spyDuplicateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          duplicateOneRoute,
          duplicateOneRoute.version,
          duplicateOneRoute.validationPipeOptions,
        );
        expect(spyGetManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          getManyRoute,
          getManyRoute.version,
          getManyRoute.validationPipeOptions,
        );
        expect(spyGetOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          getOneRoute,
          getOneRoute.version,
          getOneRoute.validationPipeOptions,
        );
        expect(spyReplaceOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          replaceOneRoute,
          replaceOneRoute.version,
          replaceOneRoute.validationPipeOptions,
        );
        expect(spyUpdateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          updateManyRoute,
          updateManyRoute.version,
          updateManyRoute.validationPipeOptions,
        );
        expect(spyUpdateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          updateOneRoute,
          updateOneRoute.version,
          updateOneRoute.validationPipeOptions,
        );
      });
    });

    it('should provide CacheInterceptor if isGlobalCacheEnabled is true', () => {
      DynamicApiModule.isGlobalCacheEnabled = true;
      const options = buildDynamicApiModuleOptionsMock();
      const module = DynamicApiModule.forFeature(options);

      // @ts-ignore
      expect(module.providers[0].useClass.name).toStrictEqual('CacheInterceptor');
    });

    it('should not provide CacheInterceptor if isGlobalCacheEnabled is false', () => {
      DynamicApiModule.isGlobalCacheEnabled = false;
      const options = buildDynamicApiModuleOptionsMock();
      const module = DynamicApiModule.forFeature(options);

      expect(module.providers).toStrictEqual([]);
    });
  });
});
