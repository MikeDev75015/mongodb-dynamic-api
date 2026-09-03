import { Type } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { FilterQuery } from 'mongoose';
import { isMongooseCastError } from '../helpers/mongoose-cast-error.helper';
import { BaseEntity } from '../models';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';

/**
 * Options for the `IsUnique` decorator.
 */
interface IsUniqueOptions<Entity extends BaseEntity> {
  /**
   * Field checked for uniqueness in the target collection.
   * Defaults to the decorated property name.
   */
  field?: keyof Entity;
  /**
   * Case-insensitive comparison. Recommended for emails/usernames.
   * @default false
   */
  caseInsensitive?: boolean;
  /**
   * Name of the sibling property on the DTO holding the current entity's id.
   * When set, that id is excluded from the uniqueness check — required for update
   * scenarios where the entity is allowed to keep its own current value.
   *
   * On MDA's own `UpdateOne` route (HTTP and WebSocket), `'id'` works out of the box with no DTO
   * changes needed: the current entity's id — which HTTP puts in the URL, never the body — is
   * automatically merged onto the validated DTO instance before this decorator runs.
   */
  ignoreId?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Async class-validator decorator ensuring no other document in `entity`'s collection
 * already has the same value for the decorated field.
 *
 * Relies on the schema registered via `DynamicApiModule.forFeature`/`forRoot` for `entity` —
 * the target entity must be registered before any request reaches this validator, otherwise
 * validation rejects with an error (fail-closed).
 *
 * @example — unique, case-insensitive email at registration
 * ```typescript
 * import { IsUnique } from 'mongodb-dynamic-api';
 * import { IsEmail } from 'class-validator';
 *
 * class RegisterUserDto {
 *   @IsEmail()
 *   @IsUnique(User, { field: 'email', caseInsensitive: true })
 *   email: string;
 * }
 * ```
 *
 * @example — unique username, ignoring the current entity on update
 * ```typescript
 * // Declared once, on the entity itself — MDA's UpdateOne route (HTTP and WebSocket) merges the
 * // current entity's id onto the DTO instance automatically; no `id` field needed on your DTO.
 * class User extends BaseEntity {
 *   @IsUnique(User, { ignoreId: 'id' })
 *   username: string;
 * }
 * ```
 */
function IsUnique<Entity extends BaseEntity>(
  entity: Type<Entity>,
  options: IsUniqueOptions<Entity> = {},
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isUnique',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [entity, options, propertyName as string],
      validator: {
        async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          const [targetEntity, opts, defaultField] =
            args.constraints as [Type<Entity>, IsUniqueOptions<Entity>, string];
          const field = String(opts.field ?? defaultField);
          const model = await DynamicApiGlobalStateService.getEntityModel(targetEntity);

          const filter = {
            [field]: opts.caseInsensitive && typeof value === 'string'
              ? { $regex: `^${escapeRegExp(value)}$`, $options: 'i' }
              : value,
          } as FilterQuery<Entity>;

          if (opts.ignoreId) {
            const currentId = (args.object as Record<string, unknown>)[opts.ignoreId];
            if (currentId) {
              Object.assign(filter, { _id: { $ne: currentId } });
            }
          }

          try {
            const existing = await model.exists(filter);
            return !existing;
          } catch (error) {
            // A malformed id (e.g. a bad `ignoreId`, or `field` matched against an ObjectId path)
            // can never safely be proven unique — fail closed instead of a raw 500.
            if (isMongooseCastError(error)) {
              return false;
            }

            throw error;
          }
        },
        defaultMessage(args: ValidationArguments): string {
          const [targetEntity, opts, defaultField] =
            args.constraints as [Type<Entity>, IsUniqueOptions<Entity>, string];
          const field = String(opts.field ?? defaultField);
          return `${field} must be unique for ${targetEntity.name}`;
        },
      },
    });
  };
}

export { IsUnique, IsUniqueOptions };
