import {
  Body,
  CanActivate,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Param,
  Type,
  UseGuards,
  UseInterceptors,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Model } from 'mongoose';
import { Public, ValidatorPipe } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import {
  addVersionSuffix,
  getDisplayedName,
  pascalCase,
  provideName,
} from '../../helpers';
import {
  DynamicApiControllerOptions,
  CustomRouteConfig,
  DynamicApiRequest,
  HttpMethod,
  Mappable,
} from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger';
import { RoutePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';

type HttpMethodDecoratorFactory = (path: string) => MethodDecorator;

const HTTP_METHOD_DECORATOR_MAP: Record<HttpMethod, HttpMethodDecoratorFactory> = {
  GET: Get,
  POST: Post,
  PATCH: Patch,
  PUT: Put,
  DELETE: Delete,
};

const logger = new MongoDBDynamicApiLogger('DynamicApiModule');

/**
 * Warns (via MONGODB_DYNAMIC_API_LOGGER, silent unless set) when a custom route's `abilityPredicate`
 * is almost certainly meant to check a single target document — it's paired with a path param and
 * `predicateBehavior` isn't `'filter'` — but that param isn't named `id` and no `targetParam` was
 * set to match it. Without either, `BasePoliciesGuard` silently falls back to its "check every
 * document matching the query string" branch instead of checking the route's actual target.
 */
function warnIfTargetParamLikelyMissing(
  entityName: string,
  routePath: string,
  abilityPredicate: unknown,
  predicateBehavior: string | undefined,
  targetParam: string | undefined,
): void {
  if (!abilityPredicate || predicateBehavior === 'filter' || targetParam) {
    return;
  }

  const pathParams = [...routePath.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  if (pathParams.length === 0 || pathParams.includes('id')) {
    return;
  }

  logger.warn(
    `[Ability Predicate] Custom route "${routePath}" on ${entityName}: abilityPredicate is set on a `
    + `route with path param(s) ${pathParams.map((p) => `:${p}`).join(', ')}, none named "id", and no `
    + `targetParam configured. The Guard's single-document check only ever looks for a param named `
    + `"id" unless targetParam says otherwise — right now it silently falls back to checking a list of `
    + `documents matched by the query string instead of the route's actual target. Set `
    + `targetParam: '${pathParams[0]}' if that's the document abilityPredicate should check.`,
  );
}

/**
 * Builds a NestJS controller class for a single custom route entry.
 *
 * The generated controller:
 *  - is mounted on the same `path` / `version` as the parent controller (unless overridden by `customRoute.version`)
 *  - injects the Mongoose model automatically via `@InjectModel`
 *  - applies `@UseGuards` with the ability-predicate guard first, then any extra guards
 *  - emits Swagger decorators (`ApiOperation`, `ApiResponse`, `ApiBody`, `ApiQuery`, `ApiBearerAuth` / `Public`)
 *  - maps the handler result through `presenter.fromEntity` when available, or returns it raw
 *    (with `ClassSerializerInterceptor` active for field-stripping)
 *
 * Class / guard names are unique per entity×path×version to avoid DI collisions.
 */
function createCustomRouteController<
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
): Type {
  const {
    path: routePath,
    method,
    handler,
    inject = [],
    version: routeVersion,
    isPublic,
    description,
    guards = [],
    abilityPredicate,
    predicateBehavior,
    targetParam,
    validationPipeOptions: routeValidationPipeOptions,
    dTOs,
    useInterceptors: routeInterceptors = [],
  } = customRouteConfig;

  const { path: controllerPath, apiTag } = controllerOptions;

  const effectiveVersion = routeVersion ?? controllerVersion;
  const effectiveValidationPipeOptions = routeValidationPipeOptions ?? controllerValidationPipeOptions;

  // Unique name components
  const baseDisplayedName = getDisplayedName(apiTag, entity.name, undefined);
  const routePathPascal = pascalCase(routePath) ?? 'Custom';
  const uniqueDisplayedName = `${routePathPascal}${baseDisplayedName}`;

  const isAuthEnabled = DynamicApiModule.state.get<boolean>('isAuthEnabled');
  const connectionName = DynamicApiModule.state.get<string>('connectionName');

  // Build ordered guard list: [abilityPredicate guard?, ...extra guards]
  const allGuards: Type<CanActivate>[] = [];
  if (abilityPredicate) {
    warnIfTargetParamLikelyMissing(entity.name, routePath, abilityPredicate, predicateBehavior, targetParam);

    const PoliciesGuard = RoutePoliciesGuardMixin(
      entity,
      'Custom',
      uniqueDisplayedName,
      effectiveVersion,
      abilityPredicate,
      { predicateBehavior, targetParam },
    );
    allGuards.push(PoliciesGuard);
  }
  allGuards.push(...guards);

  const presenterType = dTOs?.presenter ?? entity;

  // ─── Controller class ──────────────────────────────────────────────────────
  @Controller({ path: controllerPath, version: effectiveVersion })
  @ApiTags(apiTag ?? entity.name)
  @ValidatorPipe(effectiveValidationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class CustomRouteController {
    protected readonly entity = entity;

    constructor(
      @InjectModel(entity.name, connectionName)
      protected readonly model: Model<Entity>,
      protected readonly moduleRef: ModuleRef,
    ) {}

    async handle(
      @Param() params: Record<string, string>,
      @Body() body: unknown,
      @Query() query: unknown,
      @Request() req: DynamicApiRequest,
    ): Promise<unknown> {
      // strict: false — these providers live in the consuming app's own module tree, not in the
      // dedicated module this generated controller is mounted in, so a host-module-only lookup
      // (the default) would never find them.
      const injected = inject.map((token) => this.moduleRef.get(token, { strict: false }));

      const result = await handler({
        model: this.model,
        user: req?.user,
        params: params as Params,
        body: body as Body,
        query: query as QueryDto,
        req,
      }, injected);

      const fromEntity = (presenterType as Mappable<Entity>).fromEntity;
      return fromEntity ? fromEntity(result as Entity) : result;
    }
  }

  // ─── Override reflect-metadata paramtypes so ValidationPipe uses DTO classes
  if (dTOs?.body ?? dTOs?.query) {
    const paramTypes: Type[] = [Object, Object, Object, Object];
    if (dTOs?.body) paramTypes[1] = dTOs.body;
    if (dTOs?.query) paramTypes[2] = dTOs.query;
    Reflect.defineMetadata(
      'design:paramtypes',
      paramTypes,
      CustomRouteController.prototype,
      'handle',
    );
  }

  // ─── Apply method-level decorators post-hoc (same pattern as cache-purge) ─
  const descriptor = Object.getOwnPropertyDescriptor(CustomRouteController.prototype, 'handle');

  HTTP_METHOD_DECORATOR_MAP[method](routePath)(
    CustomRouteController.prototype,
    'handle',
    descriptor,
  );

  ApiOperation({
    operationId: `custom${routePathPascal}${baseDisplayedName}${effectiveVersion ? 'V' + effectiveVersion : ''}`,
    summary: description ?? `${method} /${routePath} — custom endpoint for ${entity.name}`,
  })(CustomRouteController.prototype, 'handle', descriptor);

  ApiResponse({
    type: presenterType,
  })(CustomRouteController.prototype, 'handle', descriptor);

  if (dTOs?.body) {
    ApiBody({ type: dTOs.body })(CustomRouteController.prototype, 'handle', descriptor);
  }

  if (dTOs?.query) {
    ApiQuery({ type: dTOs.query })(CustomRouteController.prototype, 'handle', descriptor);
  }

  if (allGuards.length > 0) {
    UseGuards(...allGuards)(CustomRouteController.prototype, 'handle', descriptor);
  }

  // ─── Route-level interceptors (e.g. FileInterceptor) ──────────────────────
  if (routeInterceptors.length > 0) {
    UseInterceptors(...routeInterceptors)(CustomRouteController.prototype, 'handle', descriptor);
  }

  if (isPublic) {
    Public()(CustomRouteController.prototype, 'handle', descriptor);
  } else if (isAuthEnabled) {
    ApiBearerAuth()(CustomRouteController.prototype, 'handle', descriptor);
  }

  // ─── Unique class name ─────────────────────────────────────────────────────
  Object.defineProperty(CustomRouteController, 'name', {
    value: `Custom${uniqueDisplayedName}${addVersionSuffix(effectiveVersion)}Controller`,
    writable: false,
  });

  return CustomRouteController;
}

/**
 * Returns the deterministic class name that `createCustomRouteController` will assign.
 * Useful for assertions in unit and e2e tests.
 */
function getCustomRouteControllerName(
  entityName: string,
  routePath: string,
  apiTag?: string,
  version?: string,
): string {
  const baseDisplayedName = getDisplayedName(apiTag, entityName, undefined);
  const routePathPascal = pascalCase(routePath) ?? 'Custom';
  return `Custom${routePathPascal}${baseDisplayedName}${addVersionSuffix(version)}Controller`;
}

/**
 * Returns the deterministic guard class name that `createCustomRouteController` will assign
 * when an `abilityPredicate` is provided.
 */
function getCustomRoutePoliciesGuardName(
  entityName: string,
  routePath: string,
  apiTag?: string,
  version?: string,
): string {
  const baseDisplayedName = getDisplayedName(apiTag, entityName, undefined);
  const routePathPascal = pascalCase(routePath) ?? 'Custom';
  const uniqueDisplayedName = `${routePathPascal}${baseDisplayedName}`;
  return provideName('Custom', uniqueDisplayedName, version, 'PoliciesGuard');
}

export {
  createCustomRouteController,
  getCustomRouteControllerName,
  getCustomRoutePoliciesGuardName,
};


