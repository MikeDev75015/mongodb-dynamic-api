import { BaseEntity } from '../../models';
import { ReplaceOneService } from './replace-one-service.interface';

interface ReplaceOneController<Entity extends BaseEntity> {
  replaceOne(id: string, partial: Partial<Entity>): Promise<Entity | undefined>;
}

type ReplaceOneControllerConstructor<Entity extends BaseEntity> = new (
  service: ReplaceOneService<Entity>,
) => ReplaceOneController<Entity>;

export type { ReplaceOneController, ReplaceOneControllerConstructor };
