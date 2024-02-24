import { BaseEntity } from '@dynamic-api';
import { ReplaceOneService } from '@dynamic-api/modules';

interface ReplaceOneController<Entity extends BaseEntity> {
  replaceOne(id: string, partial: Partial<Entity>): Promise<Entity | undefined>;
}

type ReplaceOneControllerConstructor<Entity extends BaseEntity> = new (
  service: ReplaceOneService<Entity>,
) => ReplaceOneController<Entity>;

export type { ReplaceOneController, ReplaceOneControllerConstructor };
