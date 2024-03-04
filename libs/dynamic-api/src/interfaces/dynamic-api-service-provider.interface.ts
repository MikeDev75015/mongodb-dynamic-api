import { Type } from '@nestjs/common';

interface DynamicAPIServiceProvider {
  provide: string;
  useClass: Type;
}

export type { DynamicAPIServiceProvider };