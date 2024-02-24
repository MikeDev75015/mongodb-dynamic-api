import { BaseEntity, DeletedCount } from "@dynamic-api";
import { DeleteOneService } from '@dynamic-api/modules';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface DeleteOneController<Entity extends BaseEntity> {
  deleteOne(id: string): Promise<DeletedCount>;
}

type DeleteOneControllerConstructor<Entity extends BaseEntity> = new (
  service: DeleteOneService<Entity>,
) => DeleteOneController<Entity>;

export type { DeleteOneController, DeleteOneControllerConstructor };
