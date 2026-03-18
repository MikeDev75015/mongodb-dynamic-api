import { pick } from '../../helpers';
import { BaseEntity } from '../../models';

function buildAuthBroadcastData<Entity extends BaseEntity>(
  user: Partial<Entity>,
  fields?: (keyof Entity)[],
): Partial<Entity> {
  if (!fields?.length) {
    return { ...user };
  }

  return pick(user, fields as string[]) as Partial<Entity>;
}

export { buildAuthBroadcastData };
