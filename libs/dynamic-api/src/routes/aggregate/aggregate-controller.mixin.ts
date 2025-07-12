import { BadRequestException, Query, Type, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
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
  { dTOs, isArrayResponse, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
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
    isArrayResponse,
  );

  const toPipeline = (
    AggregateQuery as Aggregatable<AggregateQuery>
  ).toPipeline;

  class AggregatePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
    toPipeline,
  ) {}

  class BaseAggregateController implements AggregateController<Entity, AggregateQuery, AggregatePresenter> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: AggregateService<Entity>,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(AggregatePoliciesGuard)
    async aggregate(@Query() query: AggregateQuery) {
      const toPipeline = (
        AggregateQuery as Aggregatable<AggregateQuery>
      ).toPipeline;

      if (!toPipeline) {
        throw new BadRequestException('Query DTO must have toPipeline static method');
      }

      const pipelineBuilt = toPipeline(plainToInstance(AggregateQuery, query));

      if (!pipelineBuilt.length) {
        throw new BadRequestException('Invalid pipeline, no stages found');
      }

      const { list, count, totalPage } = await this.service.aggregate(pipelineBuilt);

      const fromAggregate = (
        AggregatePresenter as Mappable<Entity>
      ).fromAggregate;

      return fromAggregate ? fromAggregate<AggregatePresenter>(list, count, totalPage) : list;
    }
  }

  Object.defineProperty(BaseAggregateController, 'name', {
    value: `Base${provideName('Aggregate', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseAggregateController;
}

export { AggregateControllerMixin };
