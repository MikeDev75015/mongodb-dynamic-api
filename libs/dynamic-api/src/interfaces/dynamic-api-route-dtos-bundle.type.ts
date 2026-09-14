import { Type } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { DeleteResult } from './dynamic-api-route-response.type';


interface Mappable<Entity> {
  toEntity?: <DTO = any>(body: DTO) => Partial<Entity>;
  toEntities?: <DTO = any>(body: DTO) => Partial<Entity>[];
  fromDeleteResult?: <Presenter = any>(result: DeleteResult) => Presenter;
  fromEntity?: <Presenter = any, User = any>(entity: Entity, user?: User) => Presenter;
  fromEntities?: <Presenter = any, User = any>(entities: Entity[], user?: User) => Presenter[];
  fromAggregate?: <Presenter = any>(entities: Entity[], count: number, totalPage: number) => Presenter;
}

interface Aggregatable<Query> {
  toPipeline?: (query: Query) => PipelineStage[];
}

type DTOsBundle = {
  query?: Type;
  param?: Type;
  body?: Type;
  presenter?: Type;
};

export { Aggregatable, DTOsBundle, Mappable };
