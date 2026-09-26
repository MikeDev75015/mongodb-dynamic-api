import { pick } from '../../helpers/lodash.helper';
import { BaseEntity } from '../../models';
import { DynamicApiGlobalStateService } from '../../services/dynamic-api-global-state/dynamic-api-global-state.service';

/**
 * Builds the payload of an auth broadcast from `user`, restricted to `fields` when given. The
 * password and refresh-token fields are always removed, even when listed in `fields`.
 */
function buildAuthBroadcastData<Entity extends BaseEntity>(
  user: Partial<Entity>,
  fields?: (keyof Entity)[],
): Partial<Entity> {
  const data = (fields?.length ? pick(user, fields as string[]) : { ...user }) as Record<string, unknown>;

  const passwordField = DynamicApiGlobalStateService.getValue('credentials')?.passwordField;
  const refreshTokenField = DynamicApiGlobalStateService.getValue('refreshTokenField');

  for (const sensitiveField of [passwordField, refreshTokenField]) {
    if (sensitiveField) {
      delete data[sensitiveField];
    }
  }

  return data as Partial<Entity>;
}

export { buildAuthBroadcastData };
