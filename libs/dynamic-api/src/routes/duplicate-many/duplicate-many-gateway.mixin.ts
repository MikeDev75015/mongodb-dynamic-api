import { Type, UseFilters, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { ManyEntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin, SocketPoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateManyGateway, DuplicateManyGatewayConstructor } from './duplicate-many-gateway.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateManyGatewayConstructor<Entity> {
  const {
    routeType,
    displayedName,
    isPublic,
    event,
    abilityPredicate,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
    true,
  );

  class DuplicateManyData extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(DuplicateManyData, 'name', {
    value: `DuplicateMany${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class DuplicateManyResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(DuplicateManyResponse, 'name', {
    value: dTOs?.presenter
      ? `DuplicateMany${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class GetManyPoliciesGuard extends SocketPoliciesGuardMixin(
    entity,
    routeType,
    event,
    version,
    abilityPredicate,
    isPublic,
  ) {}

  class BaseDuplicateManyGateway extends BaseGateway<Entity> implements DuplicateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard(isPublic), GetManyPoliciesGuard)
    @SubscribeMessage(event)
    async duplicateMany(
      @ConnectedSocket() _socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery & DuplicateManyData,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      const { ids, ...data } = body;

      const toEntity = (
        DuplicateManyData as Mappable<Entity>
      ).toEntity;

      const list = await this.service.duplicateMany(
        ids,
        !isEmpty(data) && toEntity ? toEntity(data) : data as Partial<Entity>,
      );

      const fromEntities = (
        DuplicateManyResponse as Mappable<Entity>
      ).fromEntities;

      return {
        event,
        data: fromEntities ? fromEntities<DuplicateManyResponse>(list) : list,
      };
    }
  }

  Object.defineProperty(BaseDuplicateManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDuplicateManyGateway;
}

export { DuplicateManyGatewayMixin };
