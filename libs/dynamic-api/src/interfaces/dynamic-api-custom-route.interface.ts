import { CanActivate, NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';
import { AbilityPredicate, PredicateBehavior } from './dynamic-api-ability.interface';
import { DynamicApiRequest } from './dynamic-api-request.interface';
import { Mappable } from './dynamic-api-route-dtos-bundle.type';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

/**
 * Supported HTTP methods for a custom route.
 */
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Execution context passed to every custom route handler.
 *
 * @template Entity  - The Mongoose entity class.
 * @template Body    - Body DTO type. Defaults to `unknown`.
 * @template Query   - Query DTO type. Defaults to `unknown`.
 * @template Params  - Route params — record of string values. Defaults to `Record<string, string>`.
 */
interface CustomRouteContext<
  Entity extends BaseEntity,
  Body = unknown,
  Query = unknown,
  Params extends Record<string, string> = Record<string, string>,
> {
  /** Injected Mongoose model for the entity. */
  model: Model<Entity>;
  /** Authenticated user from the JWT guard (`req.user`). `undefined` when the route is public. */
  user: unknown;
  /** Parsed route params (e.g. `{ id: '...' }`). */
  params: Params;
  /** Parsed request body. */
  body: Body;
  /** Parsed query string object. */
  query: Query;
  /**
   * The raw HTTP request object.
   *
   * Available **only** in HTTP context (not in WebSocket/gateway handlers, where it is `undefined`).
   *
   * Useful for accessing Multer file uploads (via `FileInterceptor`) or other low-level
   * request properties that are not available through the typed `body`/`query` fields.
   *
   * @example — reading a Multer file added by `FileInterceptor`
   * ```typescript
   * import type { DynamicApiRequest } from 'mongodb-dynamic-api';
   *
   * const handleUpload = async ({ req }) => {
   *   interface UploadRequest extends DynamicApiRequest { file?: Express.Multer.File }
   *   const file = (req as UploadRequest)?.file;
   *   // ...
   * };
   * ```
   */
  req?: DynamicApiRequest;
}

/**
 * Configuration object for a single custom route registered via `forFeature({ customRoutes })`.
 *
 * @template Entity   - The Mongoose entity class (must extend `BaseEntity`).
 * @template Body     - Body DTO type. Defaults to `unknown`.
 * @template Query    - Query DTO type. Defaults to `unknown`.
 * @template Params   - Route params type. Defaults to `Record<string, string>`.
 * @template Response - Return type of the handler. Defaults to `unknown`.
 *
 * @example
 * ```typescript
 * {
 *   path: ':id/e2ee-wrapped-keys',
 *   method: 'PATCH',
 *   description: 'Update wrapped E2EE key for a conversation',
 *   handler: async ({ model, user, params, body }) => {
 *     return model.findByIdAndUpdate(params.id, { $set: { wrappedKey: body.wrappedKey } }, { new: true });
 *   },
 *   dTOs: { body: UpdateWrappedKeyDto, presenter: ConversationPresenter },
 * }
 * ```
 */
interface CustomRouteConfig<
  Entity extends BaseEntity,
  Body = unknown,
  Query = unknown,
  Params extends Record<string, string> = Record<string, string>,
  Response = unknown,
> {
  /**
   * Route sub-path appended to the controller's base path.
   * May contain NestJS route params (e.g. `:id/e2ee-wrapped-keys`).
   */
  path: string;

  /** HTTP method for the route. */
  method: HttpMethod;

  /**
   * Pure async function executed when the route is matched.
   * Receives the fully-typed execution context, and — when `inject` is set — the resolved
   * provider instances as a second argument, in the same order.
   *
   * @example
   * ```typescript
   * {
   *   inject: [MailService],
   *   handler: async (ctx, [mailService]) => {
   *     const mail = mailService as MailService; // inject is untyped — cast to the real type
   *     await mail.send(...);
   *   },
   * }
   * ```
   */
  handler: (ctx: CustomRouteContext<Entity, Body, Query, Params>, injected: unknown[]) => Promise<Response>;

  /**
   * Application providers to resolve and pass to `handler`'s second argument, in order — a
   * service, a repository, anything registered as a Nest provider anywhere in your app (not just
   * the module that declared this entity's `forFeature`).
   *
   * Resolved via `ModuleRef.get(token, { strict: false })` on every request. Each entry can be a
   * class token, a string token, or a symbol token — the same tokens `@Inject()` accepts.
   *
   * Without this, a custom route handler only ever gets `{ model, user, params, body, query,
   * req }` — no way to reach an application service like a mailer — which used to force routes
   * that needed one out of `customRoutes` entirely into a hand-written Nest controller
   * reimplementing its own JWT guard and raw Mongoose access from scratch.
   *
   * @example
   * ```typescript
   * import { MailService } from '../mail/mail.service';
   *
   * const inviteMemberRoute: CustomRouteConfig<Family, InviteFamilyMemberDto> = {
   *   path: 'invite-member',
   *   method: 'POST',
   *   inject: [MailService],
   *   handler: async (ctx, [mailService]) => {
   *     const mail = mailService as MailService;
   *     await mail.send(ctx.body.email, 'invite', { familyId: ctx.params.id });
   *     return { sent: true };
   *   },
   * };
   * ```
   */
  inject?: Array<Type<unknown> | string | symbol>;

  /**
   * Route-level version override.
   * Falls back to `controllerOptions.version` if omitted.
   */
  version?: string;

  /**
   * Mark the route as publicly accessible (no JWT required).
   * Falls back to `controllerOptions.isPublic` if omitted.
   */
  isPublic?: boolean;

  /** Swagger `summary` for this route. Auto-generated if omitted. */
  description?: string;

  /**
   * Extra NestJS guard classes applied **after** the ability-predicate guard.
   * Each entry must be a class implementing `CanActivate`.
   */
  guards?: Type<CanActivate>[];

  /**
   * Ability predicate function identical to `DynamicApiRouteConfig.abilityPredicate`.
   * When provided, a `RoutePoliciesGuard` is automatically created and prepended to the guard chain.
   */
  abilityPredicate?: AbilityPredicate<Entity>;

  /** Controls how the ability predicate is applied (`'throw'` | `'filter'`). */
  predicateBehavior?: PredicateBehavior;

  /**
   * Name of the route param identifying the single document `abilityPredicate` should check.
   *
   * The generated Guard only runs its "check this exact document" branch when it finds a route
   * param named literally `id` — standard routes always use that name, but a custom route's
   * `path` can use anything (`:userId`, `:code`, ...). Without `targetParam` set to match, the
   * Guard silently falls back to a "check every document matching the query string" branch
   * instead — almost never what you want for a route like `path: 'parental-consent/:userId'`,
   * and easy to miss since nothing errors: the predicate still runs, just against the wrong data.
   *
   * @example
   * ```typescript
   * {
   *   path: 'parental-consent/:userId',
   *   targetParam: 'userId', // instead of requiring the param to be named :id
   *   abilityPredicate: isSameFamilyNotSelf,
   *   handler: async ({ model, params }) => model.findByIdAndUpdate(params.userId, { consented: true }),
   * }
   * ```
   */
  targetParam?: Extract<keyof Params, string>;

  /** Optional validation pipe options, merged with `validationPipeOptions` from `controllerOptions`. */
  validationPipeOptions?: ValidationPipeOptions;

  /**
   * Exposes the route via **WebSocket** in addition to HTTP.
   * Accepts `true` for default gateway options, or a `GatewayMetadata` object for custom configuration.
   * Same behaviour as `webSocket` on standard `DynamicApiRouteConfig` entries.
   */
  webSocket?: DynamicApiWebSocketOptions;

  /**
   * Custom WebSocket event name for this route.
   * Overrides the auto-generated name: `kebabCase('custom/{path}/{entityName}')`.
   */
  eventName?: string;

  /** DTO classes for Swagger documentation and validation. */
  dTOs?: {
    /** Class used to validate and document the request body. */
    body?: Type;
    /** Class used to validate and document the query string. */
    query?: Type;
    /**
     * Class documenting the route's path params in Swagger/OpenAPI — one `@ApiParam` entry per
     * declared property, in place of the empty params interface OpenAPI generators (e.g.
     * `ng-openapi-gen`) otherwise produce for a custom route, which then never substitute the
     * param placeholder(s) in the generated client's URL.
     *
     * Documentation only — unlike `body`/`query`, this does **not** validate or transform
     * `ctx.params` (still the raw `Record<string, string>` NestJS parses from the URL).
     *
     * Give every property a field initializer with a representative value (not just a TS type
     * annotation) — the value's runtime type is what gets reflected in the generated Swagger
     * type, the same convention `EntityParam` (`id = ''`) already follows for native routes.
     *
     * @example
     * ```typescript
     * class InviteMemberParams {
     *   familyId = '';
     * }
     *
     * {
     *   path: ':familyId/invite-member',
     *   dTOs: { params: InviteMemberParams, body: InviteFamilyMemberDto },
     * }
     * ```
     */
    params?: Type;
    /**
     * Presenter class for the response.
     * If it exposes a static `fromEntity` method, the handler result is mapped through it.
     * Falls back to returning the raw handler result with `ClassSerializerInterceptor` applied.
     */
    presenter?: Type & Partial<Mappable<Entity>>;
  };

  /**
   * Route-level NestJS interceptors applied **only** to this custom route.
   *
   * Use this to attach per-route interceptors such as `FileInterceptor` for multipart
   * uploads without touching the controller-level `useInterceptors`.
   *
   * @example — multipart file upload via `FileInterceptor`
   * ```typescript
   * import { FileInterceptor } from '@nestjs/platform-express';
   *
   * {
   *   method: 'POST',
   *   path: ':id/attachments/upload',
   *   useInterceptors: [FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })],
   *   handler: async ({ req }) => {
   *     interface UploadRequest extends DynamicApiRequest { file?: Express.Multer.File }
   *     const file = (req as UploadRequest).file;
   *     // process file ...
   *   },
   * }
   * ```
   */
  useInterceptors?: Type<NestInterceptor>[];
}

export type { HttpMethod, CustomRouteContext, CustomRouteConfig };

