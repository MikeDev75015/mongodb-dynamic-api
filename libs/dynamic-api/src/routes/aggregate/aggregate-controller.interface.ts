import { DynamicApiRequest } from '../../interfaces';
import { BaseEntity } from '../../models';
import { AggregateService } from './aggregate-service.interface';

interface AggregateController<Entity extends BaseEntity, Query = unknown, Response = unknown> {
  aggregate(query: Query, req?: DynamicApiRequest): Promise<Entity[] | Response[] | Response>;
}

type AggregateControllerConstructor<Entity extends BaseEntity> = new (
  service: AggregateService<Entity>,
) => AggregateController<Entity>;

export type { AggregateController, AggregateControllerConstructor };
