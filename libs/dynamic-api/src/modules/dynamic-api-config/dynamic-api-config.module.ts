import { DynamicModule, Module } from '@nestjs/common';
import { DYNAMIC_API_GLOBAL_STATE, DynamicApiGlobalState } from '../../interfaces';

@Module({})
export class DynamicApiConfigModule {
  static register(config: DynamicApiGlobalState): DynamicModule {
    return {
      global: true,
      module: DynamicApiConfigModule,
      providers: [
        {
          provide: DYNAMIC_API_GLOBAL_STATE,
          useValue: config,
        },
      ],
      exports: [DYNAMIC_API_GLOBAL_STATE],
    };
  }
}
