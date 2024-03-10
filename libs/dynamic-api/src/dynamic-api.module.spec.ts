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

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('forRoot', () => {
    it('should throw an error if no uri or invalid is provided', () => {
      expect(() => DynamicApiModule.forRoot('')).toThrowError(
        'You must provide a valid mongodb uri in the forRoot method to use MongoDB Dynamic API',
      );
    });

    it('should have default connection name value', () => {
      expect(DynamicApiModule.state.get('connectionName')).toStrictEqual('dynamic-api-connection');
    });

    it('should call MongooseModule.forRoot with uri and DynamicApiModule.connectionName', () => {
      const uri = 'fake-uri';
      DynamicApiModule.forRoot(uri);

      expect(MongooseModule.forRoot).toHaveBeenCalledWith(uri, {
        connectionName: DynamicApiModule.state.get('connectionName'),
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
        DynamicApiModule.forRoot(uri);

        expect(spyCacheModuleRegister).toHaveBeenCalledWith({ isGlobal: true });
      });

      it('should pass cacheOptions to CacheModule.register', () => {
        const uri = 'fake-uri';
        const cacheOptions = { max: 100 };
        DynamicApiModule.forRoot(uri, { cacheOptions });

        expect(spyCacheModuleRegister).toHaveBeenCalledWith({ isGlobal: true, ...cacheOptions });
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

    it('should call MongooseModule.forFeature with DynamicApiModule.connectionName', async () => {
      const { entity, controllerOptions, routes } = defaultOptions;

      const module = await DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(MongooseModule.forFeature).toHaveBeenCalledWith(
        [{ name: entity.name, schema: expect.any(Object) }],
        DynamicApiModule.state.get('connectionName'),
      );
      expect(module.imports.length).toStrictEqual(11);
    });

    it('should set timestamps to true', () => {
      DynamicApiModule.forFeature(defaultOptions);

      expect(fakeSchema.set).toHaveBeenCalledWith('timestamps', true);
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

    it('should reject if DynamicApiModule state could not be initialized ', async () => {
      jest.spyOn(global, 'setInterval').mockReturnValueOnce({ hasRef: () => false } as NodeJS.Timeout);
      jest.spyOn(global, 'setTimeout').mockImplementationOnce((callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return { hasRef: () => false } as NodeJS.Timeout;
      });

      const options = buildDynamicApiModuleOptionsMock({
        controllerOptions: { path: 'fake-path', version: '1' },
        routes: [{ type: 'GetMany' }],
      });

      await expect(DynamicApiModule.forFeature(options)).rejects.toStrictEqual(
        new Error('Dynamic API state could not be initialized. Please check your configuration.'),
      );
      expect(setInterval).toHaveBeenCalledTimes(1);
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

        DynamicApiModule.state.set(['initialized', true]);
      });

      it('should throw an error if route type is not implemented', async () => {
        const options = buildDynamicApiModuleOptionsMock({
          routes: [{ type: 'FakeType' as RouteType }],
        });

        await expect(DynamicApiModule.forFeature(options)).rejects.toStrictEqual(
          new Error('Route module for FakeType not found'),
        );
      });

      it('should throw an error if version not match a numeric string', async () => {
        const options = buildDynamicApiModuleOptionsMock({
          controllerOptions: { path: '/version', version: 'v1' },
        });

        await expect(DynamicApiModule.forFeature(options)).rejects.toStrictEqual(
          new Error(
            'Invalid version v1 for GetMany route. Version must be a string that matches numeric format, e.g. 1, 2, 3, ..., 99.',
          ),
        );
      });

      it('should import route modules with controller options', async () => {
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

        const module = await DynamicApiModule.forFeature(options);

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

      it('should import route modules with route options', async () => {
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

        const module = await DynamicApiModule.forFeature(options);

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

      it('should provide APP_INTERCEPTOR with factory', async () => {
        const options = buildDynamicApiModuleOptionsMock();
        const module = await DynamicApiModule.forFeature(options);

        // @ts-ignore
        expect(module.providers[0].provide).toStrictEqual('APP_INTERCEPTOR');
        // @ts-ignore
        expect(module.providers[0].useFactory).toBeInstanceOf(Function);
      });

      it('should provide APP_GUARD with factory', async () => {
        const options = buildDynamicApiModuleOptionsMock();
        const module = await DynamicApiModule.forFeature(options);

        // @ts-ignore
        expect(module.providers[1].provide).toStrictEqual('APP_GUARD');
        // @ts-ignore
        expect(module.providers[1].useFactory).toBeInstanceOf(Function);
      });
    });
  });
});
