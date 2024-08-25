import { Type } from '@nestjs/common';
import { DeleteResult } from './dynamic-api-route-response.type';


interface Mappable<Entity> {
  toEntity?: <DTO = any>(body: DTO) => Partial<Entity>;
  toEntities?: <DTO = any>(body: DTO) => Partial<Entity>[];
  fromDeleteResult?: <Presenter = any>(result: DeleteResult) => Presenter;
  fromEntity?: <Presenter = any>(entity: Entity) => Presenter;
  fromEntities?: <Presenter = any>(entities: Entity[]) => Presenter[];
}

type DTOsBundle = {
  query?: Type;
  param?: Type;
  body?: Type;
  presenter?: Type;
};

export { DTOsBundle, Mappable };
