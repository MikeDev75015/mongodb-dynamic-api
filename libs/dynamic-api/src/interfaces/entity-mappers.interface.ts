import { BaseEntity } from '@dynamic-api';

interface BodyToPartialEntityMapper {
  toEntity?: <Entity extends BaseEntity, Body>(body: Body) => Promise<Partial<Entity>>;
}

interface EntityToPresenterMapper {
  fromEntity?: <Entity extends BaseEntity, Presenter>(entity: Entity) => Promise<Presenter>;
}

export type { BodyToPartialEntityMapper, EntityToPresenterMapper };
