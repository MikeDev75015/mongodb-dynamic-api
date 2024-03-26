import { AbilityBuilder, ExtractSubjectType, PureAbility } from '@casl/ability';
import { Type } from '@nestjs/common';
import { AppAbility, lambdaMatcher, RouteAbilityPredicate, RouteType } from '../../interfaces';
import { BaseEntity } from '../../models';

function CaslAbilityBuilder<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: RouteType,
  abilityPredicate: RouteAbilityPredicate<Entity>,
  user: unknown,
) {
  if (!entity || !routeType || !abilityPredicate || !user) {
    throw new Error('Invalid parameters, cannot build ability');
  }

  const { can, build } = new AbilityBuilder<AppAbility<Entity>>(PureAbility);
  can<Entity>(routeType, entity, (instance) => abilityPredicate(instance, user));

  return build({
    conditionsMatcher: lambdaMatcher,
    detectSubjectType: (object: Entity) => object.constructor as ExtractSubjectType<Type<Entity>>,
  });
}

export { CaslAbilityBuilder };
