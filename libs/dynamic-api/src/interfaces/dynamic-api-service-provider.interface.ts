import { Type } from '@nestjs/common';

interface DynamicApiServiceProvider {
  provide: string;
  useClass: Type;
}

export type { DynamicApiServiceProvider };
