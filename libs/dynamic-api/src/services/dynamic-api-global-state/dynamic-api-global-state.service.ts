import { BehaviorSubject } from 'rxjs';
import { DynamicApiGlobalState } from '../../interfaces';

export class DynamicApiGlobalStateService {
  private static initialized$ = new BehaviorSubject<boolean>(false);

  private _: DynamicApiGlobalState = {
    onInitialized() {
      return DynamicApiGlobalStateService.onInitialized();
    },
  } as DynamicApiGlobalState;

  constructor(initialGlobalState?: Partial<DynamicApiGlobalState>) {
    Object.assign(this._, initialGlobalState);
  }

  static onInitialized() {
    return this.initialized$;
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
