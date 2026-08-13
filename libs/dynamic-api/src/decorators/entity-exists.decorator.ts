import { Type } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { FilterQuery } from 'mongoose';
import { isMongooseCastError } from '../helpers/mongoose-cast-error.helper';
import { BaseEntity } from '../models';
import { DynamicApiGlobalStateService } from '../services';

/**
 * Options for the `EntityExists` decorator.
 */
interface EntityExistsOptions<Entity extends BaseEntity> {
  /**
   * Field matched against the decorated value in the target collection.
   * @default '_id'
   */
  field?: keyof Entity;
  /**
   * Optional dynamic filter merged into the existence query.
   * Receives the decorated value and the full DTO instance being validated, and returns
   * extra Mongo filter conditions — use it to scope the check beyond plain existence,
   * e.g. requiring the referenced document to be active, or to belong to a given owner.
   *
   * @example — reject soft-deleted or inactive families
   * ```typescript
   * filter: (_value, _dto) => ({ isActive: true })
   * ```
   *
   * @example — reject a family the current request's user does not belong to
   * ```typescript
   * filter: (_value, dto: JoinFamilyDto) => ({ members: dto.userId })
   * ```
   */
  filter?: (value: unknown, dto: unknown) => FilterQuery<Entity>;
}

/**
 * Async class-validator decorator ensuring a document referenced by the decorated field
 * exists in `entity`'s collection — optionally scoped with a dynamic `filter`.
 *
 * Relies on the schema registered via `DynamicApiModule.forFeature`/`forRoot` for `entity` —
 * the target entity must be registered before any request reaches this validator, otherwise
 * validation rejects with an error (fail-closed).
 *
 * Membership/ownership checks that depend on the *authenticated user* (rather than sibling
 * DTO fields) belong to an `abilityPredicate` (authorization), not here — this decorator only
 * sees the DTO being validated, not the request's `user`.
 *
 * @example — plain existence check by id
 * ```typescript
 * import { EntityExists } from 'mongodb-dynamic-api';
 *
 * class CreateConversationDto {
 *   @EntityExists(Family)
 *   familyId: string;
 * }
 * ```
 *
 * @example — existence scoped to an active, non-archived family
 * ```typescript
 * class CreateConversationDto {
 *   @EntityExists(Family, { filter: () => ({ isActive: true, archivedAt: null }) })
 *   familyId: string;
 * }
 * ```
 */
function EntityExists<Entity extends BaseEntity>(
  entity: Type<Entity>,
  options: EntityExistsOptions<Entity> = {},
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'entityExists',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [entity, options],
      validator: {
        async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          const [targetEntity, opts] =
            args.constraints as [Type<Entity>, EntityExistsOptions<Entity>];
          const field = String(opts.field ?? '_id');
          const model = await DynamicApiGlobalStateService.getEntityModel(targetEntity);

          const filter = {
            [field]: value,
            ...opts.filter?.(value, args.object),
          } as FilterQuery<Entity>;

          try {
            const existing = await model.exists(filter);
            return !!existing;
          } catch (error) {
            // A malformed id (the default `field` matches `_id`, an ObjectId path) can never
            // reference a real document — fail closed instead of a raw 500.
            if (isMongooseCastError(error)) {
              return false;
            }

            throw error;
          }
        },
        defaultMessage(args: ValidationArguments): string {
          const [targetEntity] = args.constraints as [Type<Entity>];
          return `Referenced ${targetEntity.name} does not exist`;
        },
      },
    });
  };
}

export { EntityExists, EntityExistsOptions };
