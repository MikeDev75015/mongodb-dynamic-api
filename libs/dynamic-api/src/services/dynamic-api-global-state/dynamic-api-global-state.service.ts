import { Schema } from 'mongoose';
import { BehaviorSubject } from 'rxjs';
import { DynamicApiGlobalState, EntitySchemas } from '../../interfaces';

export class DynamicApiGlobalStateService {
  private static readonly initialized$ = new BehaviorSubject<boolean>(false);
  private static readonly entitySchemas$  = new BehaviorSubject<EntitySchemas>({});

  private _: DynamicApiGlobalState = {} as DynamicApiGlobalState;

  private readonly defaultGlobalState: Partial<DynamicApiGlobalState> = {
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

  constructor(initialGlobalState?: Partial<DynamicApiGlobalState>) {
    Object.assign(this._, this.defaultGlobalState, initialGlobalState);
  }

  static onInitialized() {
    return this.initialized$;
  }

  static addEntitySchema<T = any>(name: string, schema: Schema<T>) {
    const entitySchemas = this.entitySchemas$.value;
    entitySchemas[name] = schema;
    this.entitySchemas$.next(entitySchemas);
  }

  static getEntitySchema<T = any>(name: string) {
    const schema = this.entitySchemas$.value[name];
    if (!schema) {
      throw new Error(`Entity schema for "${name}" not found`);
    }

    return schema as Schema<T>;
  }

  set<V>([target, value]: ([keyof DynamicApiGlobalState, value: V] | ['partial', Partial<DynamicApiGlobalState>])) {
    if (target === 'partial') {
      Object.assign(this._, value);
    } else {
      Object.assign(this._, { [target]: value });
    }

    this.updateState();
  }

  get<T = DynamicApiGlobalState>(key?: keyof DynamicApiGlobalState) {
    return (key ? this._[key] : this._) as T;
  }

  private updateState() {
    if (this._.initialized && !DynamicApiGlobalStateService.initialized$.value) {
      DynamicApiGlobalStateService.initialized$.next(true);
    }
  }
}
