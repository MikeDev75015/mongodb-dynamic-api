import { BadRequestException, Query, Request, SetMetadata, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RouteDecoratorsBuilder } from '../../builders';
import { DISABLE_CACHE_KEY } from '../../decorators';
import { addVersionSuffix } from '../../helpers/versioning-config.helper';
import { getMixinData } from '../../helpers/mixin-data.helper';
import { provideName } from '../../helpers/format.helper';
import { RouteDecoratorsHelper } from '../../helpers/route-decorators.helper';
import { warnIfPagingResultDropped } from '../../helpers/paging-presenter-warning.helper';
import { Aggregatable, DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { AggregateController, AggregateControllerConstructor } from './aggregate-controller.interface';
import { AggregatePresenterMixin } from './aggregate-presenter.mixin';
import { AggregateService } from './aggregate-service.interface';

function AggregateControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], isArrayResponse, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): AggregateControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    disableCache,
    abilityPredicate,
    predicateBehavior,
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

  class AggregatePoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
    { queryToPipeline: toPipeline, predicateBehavior },
  ) {}

  class BaseAggregateController implements AggregateController<Entity, AggregateQuery, AggregatePresenter> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: AggregateService<Entity>,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(AggregatePoliciesGuard)
    @UseInterceptors(...useInterceptors)
    @SetMetadata(DISABLE_CACHE_KEY, disableCache)
    async aggregate(@Query() query: AggregateQuery, @Request() req?: DynamicApiRequest) {
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

      const { list, count, totalPage } = await this.service.aggregate(pipelineBuilt, req?.user);

      const fromAggregate = (
        AggregatePresenter as Mappable<Entity>
      ).fromAggregate;

      warnIfPagingResultDropped(pipelineBuilt, !!fromAggregate, entity.name);

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
