import {
  CanActivate,
  ClassSerializerInterceptor,
  Optional,
  Type,
  UseFilters,
  UseGuards,
  UseInterceptors,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Model } from 'mongoose';
import { ValidatorPipe } from '../../decorators';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { addVersionSuffix, getDisplayedName, kebabCase, pascalCase } from '../../helpers';
import {
  CustomRouteConfig,
  DynamicApiControllerOptions,
  ExtendedSocket,
  GatewayOptions,
  GatewayResponse,
  Mappable,
} from '../../interfaces';
import { SocketPoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiModule } from '../../dynamic-api.module';
import { CustomRouteCallbackService } from './custom-route-callback.service';

/**
 * Builds a NestJS WebSocket gateway class for a single custom route entry.
 *
 * The generated gateway:
 *  - is decorated with `@WebSocketGateway(gatewayOptions)`
 *  - injects the Mongoose model automatically via `@InjectModel`
 *  - applies `JwtSocketGuard` + optional `SocketPoliciesGuardMixin` + extra `guards`
 *  - subscribes to an auto-generated event name (`kebabCase('custom/{path}/{entityName}')`)
 *    or to `customRoute.eventName` when provided
 *  - calls `handler` with `{ model, user, params: {}, body, query: {} }`
 *  - maps the handler result through `presenter.fromEntity` when available
 */
function createCustomRouteGateway<
  Entity extends BaseEntity,
  Body = unknown,
  QueryDto = unknown,
  Params extends Record<string, string> = Record<string, string>,
  Response = unknown,
>(
  entity: Type<Entity>,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  customRouteConfig: CustomRouteConfig<Entity, Body, QueryDto, Params, Response>,
  controllerVersion?: string,
  controllerValidationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): Type {
  const {
    path: routePath,
    handler,
    inject = [],
    version: routeVersion,
    isPublic,
    guards = [],
    abilityPredicate,
    authAbilityPredicate,
    predicateBehavior,
    validationPipeOptions: routeValidationPipeOptions,
    eventName,
    dTOs,
  } = customRouteConfig;

  const { apiTag } = controllerOptions;

  const effectiveVersion = routeVersion ?? controllerVersion;
  const effectiveValidationPipeOptions = routeValidationPipeOptions ?? controllerValidationPipeOptions;

  const connectionName = DynamicApiModule.state.get<string>('connectionName');
  const displayedName = getDisplayedName(apiTag, entity.name, undefined);
  const routePathPascal = pascalCase(routePath) ?? 'Custom';
  const uniqueDisplayedName = `${routePathPascal}${displayedName}`;

  const event = eventName ?? kebabCase(`custom/${routePath}/${apiTag ?? entity.name}`);

  const presenterType = dTOs?.presenter ?? entity;

  // Build ordered guard list: JwtSocketGuard → [abilityPredicate guard?] → ...extra guards
  const guardInstances: (InstanceType<typeof JwtSocketGuard> | Type<CanActivate>)[] = [
    new JwtSocketGuard(isPublic),
  ];

  if (abilityPredicate || authAbilityPredicate) {
    const PoliciesGuard = SocketPoliciesGuardMixin(
      entity,
      'Custom',
      event,
      effectiveVersion,
      { abilityPredicate, isPublic, predicateBehavior, authAbilityPredicate },
    );
    guardInstances.push(PoliciesGuard);
  }

  guardInstances.push(...guards);

  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(effectiveValidationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class CustomRouteGateway extends BaseGateway<Entity> {
    protected readonly entity = entity;
    protected readonly callbackService: CustomRouteCallbackService<Entity>;

    constructor(
      @InjectModel(entity.name, connectionName)
      protected readonly model: Model<Entity>,
      @Optional() protected readonly jwtService: JwtService,
      protected readonly moduleRef: ModuleRef,
    ) {
      super(jwtService);
      this.callbackService = new CustomRouteCallbackService(model);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(...guardInstances)
    @SubscribeMessage(event)
    async handle(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: unknown,
    ): GatewayResponse<unknown> {
      // strict: false — see the same note in create-custom-route-controller.ts.
      const injected = inject.map((token) => this.moduleRef.get(token, { strict: false }));

      const result = await handler({
        model: this.model,
        user: socket?.user,
        params: {} as Params,
        body: body as Body,
        query: {} as QueryDto,
        methods: this.callbackService.getCallbackMethods(),
      }, injected);

      const fromEntity = (presenterType as Mappable<Entity>).fromEntity;
      const data = fromEntity ? fromEntity(result as Entity) : result;

      return { event, data };
    }
  }

  Object.defineProperty(CustomRouteGateway, 'name', {
    value: `Custom${uniqueDisplayedName}${addVersionSuffix(effectiveVersion)}Gateway`,
    writable: false,
  });

  return CustomRouteGateway;
}

/**
 * Returns the deterministic class name that `createCustomRouteGateway` will assign.
 * Useful for assertions in unit and e2e tests.
 */
function getCustomRouteGatewayName(
  entityName: string,
  routePath: string,
  apiTag?: string,
  version?: string,
): string {
  const displayedName = getDisplayedName(apiTag, entityName, undefined);
  const routePathPascal = pascalCase(routePath) ?? 'Custom';
  return `Custom${routePathPascal}${displayedName}${addVersionSuffix(version)}Gateway`;
}

export { createCustomRouteGateway, getCustomRouteGatewayName };



