import { BaseEntity } from '../../models';
import { AggregateService } from './aggregate-service.interface';

interface AggregateController<Entity extends BaseEntity, Query = any, Response = any> {
  aggregate(query: Query): Promise<Entity[] | Response[] | Response>;
}

type AggregateControllerConstructor<Entity extends BaseEntity> = new (
  service: AggregateService<Entity>,
) => AggregateController<Entity>;

export type { AggregateController, AggregateControllerConstructor };
