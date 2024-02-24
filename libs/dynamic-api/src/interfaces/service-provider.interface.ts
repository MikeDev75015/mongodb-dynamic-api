import { Type } from '@nestjs/common';

interface ServiceProvider {
  provide: string;
  useClass: Type;
}

export type { ServiceProvider };