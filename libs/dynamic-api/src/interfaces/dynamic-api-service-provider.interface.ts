import { Type } from '@nestjs/common';

interface DynamicApiServiceProvider {
  provide: string;
  useClass: Type;
}

/**
 * @deprecated Use `DynamicApiServiceProvider` instead. Will be removed in v5.
 */
type DynamicAPIServiceProvider = DynamicApiServiceProvider;

export type { DynamicApiServiceProvider, DynamicAPIServiceProvider };
