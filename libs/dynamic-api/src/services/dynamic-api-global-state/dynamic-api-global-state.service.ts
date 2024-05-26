import { Type } from '@nestjs/common';
import { Connection, createConnection, Model, Schema } from 'mongoose';
import { BehaviorSubject } from 'rxjs';
import { DynamicApiGlobalState, EntitySchemas } from '../../interfaces';

export class DynamicApiGlobalStateService {
  private static readonly initialized$ = new BehaviorSubject<boolean>(false);
  private static readonly entitySchemas$  = new BehaviorSubject<EntitySchemas>({});

  private static connection: Connection | null = null;

  private static _: DynamicApiGlobalState = {} as DynamicApiGlobalState;

  private readonly defaultGlobalState: Partial<DynamicApiGlobalState> = {
    uri: '',
    connectionName: 'dynamic-api-connection',
    isGlobalCacheEnabled: true,
    isAuthEnabled: false,
    credentials: null,
    jwtSecret: undefined,
    cacheExcludedPaths: [],
    routesConfig: {
      excluded: [],
      defaults: [
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
      ],
    },
  }

  constructor(initialGlobalState: Partial<DynamicApiGlobalState> = {}) {
    this.resetState(initialGlobalState);
  }

  static onInitialized() {
    return this.initialized$;
  }

  static addEntitySchema<T = any>(entity: Type<T>, schema: Schema<T>) {
    const entitySchemas = this.entitySchemas$.value;
    if (entitySchemas[entity.name]) {
      return;
    }

    entitySchemas[entity.name] = schema;
    this.entitySchemas$.next(entitySchemas);
  }

  static async getEntityModel<T = any>(entity: Type<T>) {
    const schema = this.entitySchemas$.value[entity.name];
    if (!schema) {
      throw new Error(`Entity schema for "${entity.name}" not found`);
    }

    if (!this.connection) {
      this.connection =
        await createConnection(this._.uri, { retryWrites: true, writeConcern: { w: 'majority' } }).asPromise();
    }

    return this.connection.model(entity.name, schema) as Model<T>;
  }

  set<V>([target, value]: ([keyof DynamicApiGlobalState, value: V] | ['partial', Partial<DynamicApiGlobalState>])) {
    if (target === 'partial') {
      Object.assign(DynamicApiGlobalStateService._, value);
    } else {
      Object.assign(DynamicApiGlobalStateService._, { [target]: value });
    }

    this.updateState();
  }

  get<T = DynamicApiGlobalState>(key?: keyof DynamicApiGlobalState) {
    return (
      key ? DynamicApiGlobalStateService._[key] : DynamicApiGlobalStateService._
    ) as T;
  }

  private resetState(initialGlobalState: Partial<DynamicApiGlobalState> = {}) {
    DynamicApiGlobalStateService.entitySchemas$.next({});
    DynamicApiGlobalStateService.connection = null;
    Object.assign(DynamicApiGlobalStateService._, { ...this.defaultGlobalState }, initialGlobalState);
  }

  private updateState() {
    if (DynamicApiGlobalStateService._.initialized && !DynamicApiGlobalStateService.initialized$.value) {
      DynamicApiGlobalStateService.initialized$.next(true);
    }
  }
}
