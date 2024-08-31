import { BadRequestException, Query, Type, UseGuards } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { Aggregatable, DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { AggregateController, AggregateControllerConstructor } from './aggregate-controller.interface';
import { AggregatePresenterMixin } from './aggregate-presenter.mixin';
import { AggregateService } from './aggregate-service.interface';

function AggregateControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): AggregateControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
  );

  if (!dTOs?.query) {
    throw new BadRequestException('Query DTO is required');
  }

  class AggregateQuery extends dTOs.query {}

  Object.defineProperty(AggregateQuery, 'name', {
    value: `Aggregate${displayedName}${addVersionSuffix(version)}Query`,
    writable: false,
  });

  class AggregatePresenter extends AggregatePresenterMixin(entity, dTOs?.presenter) {}

  Object.defineProperty(AggregatePresenter, 'name', {
    value: dTOs?.presenter
      ? `${routeType}${displayedName}${addVersionSuffix(version)}Presenter`
      : `${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    routeConfig.subPath,
    version,
    description,
    isPublic,
    {
      presenter: AggregatePresenter,
    },
  );

  class AggregatePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseAggregateController implements AggregateController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: AggregateService<Entity>,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(AggregatePoliciesGuard)
    async aggregate(@Query() query: AggregateQuery) {
      if (isEmpty(query)) {
        throw new BadRequestException('Invalid query');
      }

      const toPipeline = (
        AggregateQuery as Aggregatable<AggregateQuery>
      ).toPipeline;

      if (!toPipeline) {
        throw new BadRequestException('Query DTO must have toPipeline static method');
      }

      const list = await this.service.aggregate(toPipeline(query));

      const fromEntities = (
        AggregatePresenter as Mappable<Entity>
      ).fromEntities;

      return fromEntities ? fromEntities<AggregatePresenter>(list) : list;
    }
  }

  Object.defineProperty(BaseAggregateController, 'name', {
    value: `Base${provideName('Aggregate', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseAggregateController;
}

export { AggregateControllerMixin };
