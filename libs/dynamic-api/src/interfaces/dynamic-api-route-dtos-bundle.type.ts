import { Type } from '@nestjs/common';

type DTOsBundle = {
  query?: Type;
  param?: Type;
  body?: Type;
  presenter?: Type;
};

export { DTOsBundle };
