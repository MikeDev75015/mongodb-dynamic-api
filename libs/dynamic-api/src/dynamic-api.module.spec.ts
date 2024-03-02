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
      expect(module.imports.length).toStrictEqual(8);
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

    describe('with routes', () => {
      let spyCreateManyModule: jest.SpyInstance;
      let spyCreateOneModule: jest.SpyInstance;
      let spyDeleteOneModule: jest.SpyInstance;
      let spyDuplicateOneModule: jest.SpyInstance;
      let spyGetManyModule: jest.SpyInstance;
      let spyGetOneModule: jest.SpyInstance;
      let spyReplaceOneModule: jest.SpyInstance;
      let spyUpdateOneModule: jest.SpyInstance;

      class fakeQuery {}

      class fakeParam {}

      class fakeBody {}

      class fakeManyBody {list: any[];}

      class fakePresenter {}

      beforeEach(() => {
        spyCreateManyModule = jest.spyOn(CreateManyModule, 'forFeature');
        spyCreateOneModule = jest.spyOn(CreateOneModule, 'forFeature');
        spyDeleteOneModule = jest.spyOn(DeleteOneModule, 'forFeature');
        spyDuplicateOneModule = jest.spyOn(DuplicateOneModule, 'forFeature');
        spyGetManyModule = jest.spyOn(GetManyModule, 'forFeature');
        spyGetOneModule = jest.spyOn(GetOneModule, 'forFeature');
        spyReplaceOneModule = jest.spyOn(ReplaceOneModule, 'forFeature');
        spyUpdateOneModule = jest.spyOn(UpdateOneModule, 'forFeature');
      });

      it('should import route modules with controller options', () => {
        const createManyRoute: RouteConfig<any> = { type: 'CreateMany' };
        const createOneRoute: RouteConfig<any> = { type: 'CreateOne' };
        const deleteOneRoute: RouteConfig<any> = { type: 'DeleteOne' };
        const duplicateOneRoute: RouteConfig<any> = { type: 'DuplicateOne' };
        const getManyRoute: RouteConfig<any> = { type: 'GetMany' };
        const getOneRoute: RouteConfig<any> = { type: 'GetOne' };
        const replaceOneRoute: RouteConfig<any> = { type: 'ReplaceOne' };
        const updateOneRoute: RouteConfig<any> = { type: 'UpdateOne' };

        const options = buildDynamicApiModuleOptionsMock({
          controllerOptions: { path: 'fake-path', version: '1', validationPipeOptions: { transform: true } },
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
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyCreateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyDeleteOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyDuplicateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyGetManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyGetOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyReplaceOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
        expect(spyUpdateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: undefined },
          { description: undefined, dTOs: undefined },
          options.controllerOptions.version,
          options.controllerOptions.validationPipeOptions,
        );
      });

      it('should import route modules with route options', () => {
        const createManyRoute: RouteConfig<any> = {
          type: 'CreateMany',
          description: 'Create many items',
          dTOs: { body: fakeManyBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const createOneRoute: RouteConfig<any> = {
          type: 'CreateOne',
          description: 'Create one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const deleteOneRoute: RouteConfig<any> = {
          type: 'DeleteOne',
          description: 'Delete one item',
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const duplicateOneRoute: RouteConfig<any> = {
          type: 'DuplicateOne',
          description: 'Duplicate one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const getManyRoute: RouteConfig<any> = {
          type: 'GetMany',
          description: 'Get many items',
          dTOs: { query: fakeQuery, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const getOneRoute: RouteConfig<any> = {
          type: 'GetOne',
          description: 'Get one item',
          dTOs: { param: fakeParam, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const replaceOneRoute: RouteConfig<any> = {
          type: 'ReplaceOne',
          description: 'Replace one item',
          dTOs: { body: fakeBody, presenter: fakePresenter },
          version: '2',
          validationPipeOptions: { forbidNonWhitelisted: true },
        };
        const updateOneRoute: RouteConfig<any> = {
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
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: createManyRoute.description, dTOs: createManyRoute.dTOs },
          createManyRoute.version,
          createManyRoute.validationPipeOptions,
        );
        expect(spyCreateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: createOneRoute.description, dTOs: createOneRoute.dTOs },
          createOneRoute.version,
          createOneRoute.validationPipeOptions,
        );
        expect(spyDeleteOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: deleteOneRoute.description, dTOs: deleteOneRoute.dTOs },
          deleteOneRoute.version,
          deleteOneRoute.validationPipeOptions,
        );
        expect(spyDuplicateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: duplicateOneRoute.description, dTOs: duplicateOneRoute.dTOs },
          duplicateOneRoute.version,
          duplicateOneRoute.validationPipeOptions,
        );
        expect(spyGetManyModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: getManyRoute.description, dTOs: getManyRoute.dTOs },
          getManyRoute.version,
          getManyRoute.validationPipeOptions,
        );
        expect(spyGetOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: getOneRoute.description, dTOs: getOneRoute.dTOs },
          getOneRoute.version,
          getOneRoute.validationPipeOptions,
        );
        expect(spyReplaceOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: replaceOneRoute.description, dTOs: replaceOneRoute.dTOs },
          replaceOneRoute.version,
          replaceOneRoute.validationPipeOptions,
        );
        expect(spyUpdateOneModule).toHaveBeenCalledWith(
          fakeDatabaseModule,
          options.entity,
          { path: options.controllerOptions.path, apiTag: options.controllerOptions.apiTag },
          { description: updateOneRoute.description, dTOs: updateOneRoute.dTOs },
          updateOneRoute.version,
          updateOneRoute.validationPipeOptions,
        );
      });
    });
  });
});
