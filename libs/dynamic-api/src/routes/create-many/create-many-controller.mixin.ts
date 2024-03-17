import { Body, Type, UseGuards } from '@nestjs/common';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type as TypeTransformer } from 'class-transformer';
import { ArrayMinSize, IsInstance, ValidateNested } from 'class-validator';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, pascalCase, RouteDecoratorsHelper } from '../../helpers';
import { getPredicateFromControllerAbilityPredicates } from '../../helpers/controller-ability-predicates.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateManyController, CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyService } from './create-many-service.interface';

function CreateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  {
    path,
    apiTag,
    isPublic: isPublicController,
    abilityPredicates: controllerAbilityPredicates,
  }: DynamicApiControllerOptions<Entity>,
  {
    type: routeType,
    description,
    dTOs,
    isPublic: isPublicRoute,
    abilityPredicate: routeAbilityPredicate,
  }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateManyControllerConstructor<Entity> {
  const displayedName = pascalCase(apiTag) ?? entity.name;
  const { body: CustomBody, presenter: CustomPresenter } = dTOs ?? {};

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  class DtoBody extends EntityBodyMixin(entity) {}

  Object.defineProperty(DtoBody, 'name', {
    value: `${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class CreateManyBody {
    @ApiProperty({ type: [DtoBody] })
    @ValidateNested({ each: true })
    @IsInstance(DtoBody, { each: true })
    @ArrayMinSize(1)
    @TypeTransformer(() => DtoBody)
    list: DtoBody[];
  }

  class RouteBody extends PickType(CustomBody ?? CreateManyBody, ['list']) {}

  if (!CustomBody) {
    Object.defineProperty(RouteBody, 'name', {
      value: `CreateMany${displayedName}${addVersionSuffix(version)}Dto`,
      writable: false,
    });
  }

  class RoutePresenter extends (
    CustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  if (!CustomPresenter) {
    Object.defineProperty(RoutePresenter, 'name', {
      value: `${displayedName}${addVersionSuffix(version)}Presenter`,
      writable: false,
    });
  }

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'CreateMany',
    entity,
    version,
    description,
    isPublic,
    {
      param: undefined,
      query: undefined,
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  class CreateManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseCreateManyController implements CreateManyController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateManyService<Entity>,
    ) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateManyPoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    async createMany(@Body() body: RouteBody) {
      return this.service.createMany(body.list as unknown as Partial<Entity>[]);
    }
  }

  Object.defineProperty(BaseCreateManyController, 'name', {
    value: `BaseCreateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseCreateManyController;
}

export { CreateManyControllerMixin };
