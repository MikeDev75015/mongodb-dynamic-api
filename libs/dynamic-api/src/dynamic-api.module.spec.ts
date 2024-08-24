import { CacheModule } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { MongooseModule } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../__mocks__/dynamic-api.module.mock';
import { DynamicApiModule } from './dynamic-api.module';
import * as helpers from './helpers';
import { DynamicApiGlobalState, DynamicAPIRouteConfig, RoutesConfig, RouteType } from './interfaces';
import { BaseEntity } from './models';
import { AuthModule, DynamicApiAuthOptions } from './modules';
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
import { DynamicApiGlobalStateService } from './services';
import { DynamicApiCacheInterceptor } from './interceptors';
import { DynamicApiJwtAuthGuard } from './guards';

jest.mock('./helpers');

describe('DynamicApiModule', () => {
  beforeEach(() => {
    jest.spyOn(MongooseModule, 'forRoot').mockReturnValue(null);
    jest.spyOn(MongooseModule, 'forFeature').mockReturnValue(null);
    DynamicApiModule.state['_'] = (new DynamicApiGlobalStateService())['defaultGlobalState'];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('forRoot', () => {
    const uri = 'fake-uri';

    class UserEntity extends BaseEntity {
      name: string;

      login: string;

      pass: string;
    }

    it('should throw an error if no uri or invalid is provided', () => {
      expect(() => DynamicApiModule.forRoot('')).toThrow(
        new Error(
          'You must provide a valid mongodb uri in the forRoot method to use MongoDB Dynamic API',
        ),
      );
    });

    it('should have default connection name value', () => {
      expect(DynamicApiModule.state.get('connectionName')).toStrictEqual('dynamic-api-connection');
    });

    it('should call MongooseModule.forRoot with uri and DynamicApiModule.connectionName', () => {
      DynamicApiModule.forRoot(uri);

      expect(MongooseModule.forRoot).toHaveBeenCalledWith(uri, {
        connectionName: DynamicApiModule.state.get('connectionName'),
      });
    });

    it('should add auth module with basic options if userEntity is provided', () => {
      const spyAuthModule = jest.spyOn(AuthModule, 'forRoot').mockImplementationOnce(() => null);

      DynamicApiModule.forRoot(uri, {
        useAuth: { userEntity: UserEntity },
        cacheOptions: { excludePaths: ['/fake-path'] },
      });

      expect(spyAuthModule).toHaveBeenCalledWith({ userEntity: UserEntity });
    });

    it('should add auth module with custom options if options are provided', () => {
      const options: DynamicApiAuthOptions<UserEntity> = {
        userEntity: UserEntity,
        login: {
          loginField: 'login',
          passwordField: 'pass',
        },
      };
      const spyAuthModule = jest.spyOn(AuthModule, 'forRoot').mockImplementationOnce(() => null);

      DynamicApiModule.forRoot(uri, { useAuth: options });

      expect(spyAuthModule).toHaveBeenCalledWith(options);
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

    describe('with routes config', () => {
      const defaults = [
        'GetMany',
        'GetOne',
        'CreateMany',
        'CreateOne',
        'UpdateMany',
        'UpdateOne',
        'ReplaceOne',
        'DuplicateMany',
        'DuplicateOne',
        'DeleteMany',
        'DeleteOne',
      ];

      it('should set default route config if not provided', () => {
        const uri = 'fake-uri';
        DynamicApiModule.forRoot(uri);

        expect(DynamicApiModule.state.get('routesConfig')).toStrictEqual({ defaults, excluded: [] });
      });

      it('should set defaults for route config if provided', () => {
        const uri = 'fake-uri';
        const routesConfig = { defaults: ['GetMany'] } as Partial<RoutesConfig>;
        DynamicApiModule.forRoot(uri, { routesConfig });

        expect(DynamicApiModule.state.get('routesConfig')).toStrictEqual({ ...routesConfig, excluded: [] });
      });

      it('should set excluded for route config if provided', () => {
        const uri = 'fake-uri';
        const routesConfig = { excluded: ['GetOne'] } as Partial<RoutesConfig>;
        DynamicApiModule.forRoot(uri, { routesConfig });

        expect(DynamicApiModule.state.get('routesConfig')).toStrictEqual({ ...routesConfig, defaults });
      });
    });
  });

  describe('forFeature', () => {
    let defaultOptions: ReturnType<typeof buildDynamicApiModuleOptionsMock>;
    let mongooseModuleSpy: jest.SpyInstance;
    const fakeSchema = { set: jest.fn(), index: jest.fn(), pre: jest.fn() } as unknown as Schema;
    const fakeDatabaseModule = { module: 'fake-database-module' };

    beforeEach(() => {
      defaultOptions = buildDynamicApiModuleOptionsMock();
      jest.spyOn(helpers, 'buildSchemaFromEntity').mockReturnValue(fakeSchema as any);
      jest.spyOn(helpers, 'getDefaultRouteDescription').mockReturnValue('fake-description');
      jest.spyOn(helpers, 'isValidVersion').mockReturnValue(true);
      jest.spyOn(helpers, 'addVersionSuffix').mockReturnValue('fake-version');
      jest.spyOn(helpers, 'getDisplayedName').mockReturnValue('fake-formatted-api-tag');
      jest.spyOn(helpers, 'RouteDecoratorsHelper').mockReturnValue((_: any) => undefined);
      jest.spyOn(helpers, 'provideName').mockReturnValue('fake-provided-name');
      jest.spyOn(helpers, 'getControllerMixinData').mockReturnValue({
        routeType: 'fake-route-type' as RouteType,
        description: 'fake-description',
        isPublic: false,
        RoutePresenter: undefined,
        abilityPredicate: undefined,
        displayedName: 'fake-displayed-name',
        RouteBody: undefined,
        EntityParam: undefined,
      });
      mongooseModuleSpy = jest
      .spyOn(MongooseModule, 'forFeature')
      .mockReturnValue(fakeDatabaseModule as any);
    });

    it('should call buildSchemaFromEntity with entity', () => {
      const { entity, controllerOptions, routes } = defaultOptions;

      DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(helpers.buildSchemaFromEntity).toHaveBeenCalledWith(entity);
    });

    it('should call MongooseModule.forFeature with DynamicApiModule.connectionName', () => {
      const { entity, controllerOptions, routes } = defaultOptions;

      DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(mongooseModuleSpy).toHaveBeenCalledWith(
        [{ name: entity.name, schema: fakeSchema }],
        DynamicApiModule.state.get('connectionName'),
      );
    });

    it('should call DynamicApiGlobalStateService.addEntitySchema with entity and schema', () => {
      const { entity, controllerOptions, routes } = defaultOptions;
      const addEntitySchemaSpy = jest
      .spyOn(DynamicApiGlobalStateService, 'addEntitySchema');

      DynamicApiModule.forFeature({
        entity,
        controllerOptions,
        routes,
      });

      expect(addEntitySchemaSpy).toHaveBeenCalledWith(entity, fakeSchema);
    });

    it('should reject if DynamicApiModule state could not be initialized ', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementationOnce((callback) => {
        if (typeof callback === 'function') {
          DynamicApiModule.state.set(['initialized', false]);
          callback();
        }
        return { hasRef: () => false } as NodeJS.Timeout;
      });

      const options = buildDynamicApiModuleOptionsMock({
        controllerOptions: { path: 'fake-path', version: '1' },
        routes: [{ type: 'GetMany' }],
      });

      await expect(DynamicApiModule.forFeature(options)).rejects.toThrow(
        new Error('Dynamic API state could not be initialized. Please check your configuration.'),
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

      const cacheManager = {} as Cache;
      const reflector = {} as Reflector;
      const httpAdapterHost = {} as HttpAdapterHost;
      const state = { cacheExcludedPaths: [] } as DynamicApiGlobalState;

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

      it('should throw an error if version not match a numeric string', async () => {
        DynamicApiModule.state.set(['initialized', false]);
        DynamicApiGlobalStateService['initialized$'].next(false);
        const options = buildDynamicApiModuleOptionsMock({
          controllerOptions: { path: '/version', version: 'v1' },
        });
        jest.spyOn(helpers, 'isValidVersion').mockReturnValue(false);

        setTimeout(() => {
          DynamicApiModule.state.set(['initialized', true]);
        }, 1000);

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
          { description: 'fake-description', ...createManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyCreateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...createOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyDeleteManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...deleteManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyDeleteOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...deleteOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyDuplicateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...duplicateManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyDuplicateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...duplicateOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyGetManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...getManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyGetOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...getOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyReplaceOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...replaceOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyUpdateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...updateManyRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
        );
        expect(spyUpdateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          { description: 'fake-description', ...updateOneRoute },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
          undefined,
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
          undefined,
        );
        expect(spyCreateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          createOneRoute,
          createOneRoute.version,
          createOneRoute.validationPipeOptions,
          undefined,
        );
        expect(spyDeleteOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          deleteOneRoute,
          deleteOneRoute.version,
          deleteOneRoute.validationPipeOptions,
          undefined,
        );
        expect(spyDeleteManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          deleteManyRoute,
          deleteManyRoute.version,
          deleteManyRoute.validationPipeOptions,
          undefined,
        );
        expect(spyDuplicateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          duplicateManyRoute,
          duplicateManyRoute.version,
          duplicateManyRoute.validationPipeOptions,
          undefined,
        );
        expect(spyDuplicateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          duplicateOneRoute,
          duplicateOneRoute.version,
          duplicateOneRoute.validationPipeOptions,
          undefined,
        );
        expect(spyGetManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          getManyRoute,
          getManyRoute.version,
          getManyRoute.validationPipeOptions,
          undefined,
        );
        expect(spyGetOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          getOneRoute,
          getOneRoute.version,
          getOneRoute.validationPipeOptions,
          undefined,
        );
        expect(spyReplaceOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          replaceOneRoute,
          replaceOneRoute.version,
          replaceOneRoute.validationPipeOptions,
          undefined,
        );
        expect(spyUpdateManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          updateManyRoute,
          updateManyRoute.version,
          updateManyRoute.validationPipeOptions,
          undefined,
        );
        expect(spyUpdateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          options.controllerOptions,
          updateOneRoute,
          updateOneRoute.version,
          updateOneRoute.validationPipeOptions,
          undefined,
        );
      });

      it('should provide APP_INTERCEPTOR with factory', async () => {
        const options = buildDynamicApiModuleOptionsMock();
        const module = await DynamicApiModule.forFeature(options);

        // @ts-ignore
        expect(module.providers[0].provide).toStrictEqual('APP_INTERCEPTOR');
        // @ts-ignore
        expect(module.providers[0].useFactory).toBeInstanceOf(Function);
        // @ts-ignore
        expect(module.providers[0].useFactory(
          cacheManager,
          reflector,
          httpAdapterHost,
          state,
        )).toBeInstanceOf(DynamicApiCacheInterceptor);
      });

      it('should provide APP_GUARD with factory', async () => {
        const options = buildDynamicApiModuleOptionsMock();
        const module = await DynamicApiModule.forFeature(options);

        // @ts-ignore
        expect(module.providers[1].provide).toStrictEqual('APP_GUARD');
        // @ts-ignore
        expect(module.providers[1].useFactory).toBeInstanceOf(Function);
        // @ts-ignore
        expect(module.providers[1].useFactory(
          reflector,
          state,
        )).toBeInstanceOf(DynamicApiJwtAuthGuard);
      });
    });
  });
});
