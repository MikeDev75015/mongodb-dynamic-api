import { AbilityBuilder, createMongoAbility, ExtractSubjectType } from '@casl/ability';
import { Type } from '@nestjs/common';
import { AppAbility, DynamicApiRouteCaslAbilityPredicate, RouteType } from '../../interfaces';
import { BaseEntity } from '../../models';

function CaslAbilityBuilder<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  abilityPredicate: DynamicApiRouteCaslAbilityPredicate<Entity>,
  user: unknown,
) {
  const { can, build } = new AbilityBuilder<AppAbility<Entity>>(createMongoAbility);

  if (abilityPredicate(new entity(), user)) {
    can(routeType, entity);
  }

  return build({
    detectSubjectType: (object: Entity) => object.constructor as ExtractSubjectType<Type<Entity>>
  });
}

export { CaslAbilityBuilder };
