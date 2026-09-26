import { CanActivate, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { AbilityPredicate, AuthAbilityPredicate, PredicateBehavior, RouteType } from '../interfaces';
import { buildAbilityPredicateFilter } from '../helpers/request-filter.helper';
import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';
import { BaseEntity } from '../models';
import { BaseService } from '../services/base/base.service';

/** @internal Not part of the public API. */
abstract class BasePoliciesGuard<Entity extends BaseEntity> extends BaseService<Entity> implements CanActivate {
  protected routeType: RouteType;
  protected entity: Type<Entity>;
  protected abilityPredicate: AbilityPredicate<Entity> | undefined;
  /**
   * User-level predicate for document-less routes — checked directly against `(user, body)`,
   * never by scanning `entity`'s collection. See `CustomRouteConfig.authAbilityPredicate`.
   */
  protected authAbilityPredicate: AuthAbilityPredicate<unknown> | undefined;
  protected predicateBehavior: PredicateBehavior | undefined;
  protected queryToPipeline?: (query: unknown) => PipelineStage[];
  /**
   * Name of the route param identifying the single document to check, when it isn't `id`
   * (standard routes always use `id`; a custom route's `path` can use anything). See
   * `CustomRouteConfig.targetParam`.
   */
  protected targetParam: string | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, query, params, body } = context.switchToHttp().getRequest();

    if (this.authAbilityPredicate) {
      if (!user || !this.authAbilityPredicate(user, body)) {
        throw new ForbiddenException('Access Denied');
      }
    }

    if (this.abilityPredicate && this.predicateBehavior !== 'filter') {
      if (!user) {
        throw new ForbiddenException('Access Denied');
      }

      const targetId = params?.[this.targetParam ?? 'id'];

      if (targetId) {
        await this.findOneDocumentWithAbilityPredicate(
          targetId, buildAbilityPredicateFilter(query), undefined, user,
        );
      } else if (this.routeType === 'Aggregate' && query && this.queryToPipeline) {
        await this.aggregateDocumentsWithAbilityPredicate(this.queryToPipeline(query), user);
      } else {
        await this.findManyDocumentsWithAbilityPredicate(buildAbilityPredicateFilter(query), user);
      }
    }

    return true;
  }
}

/** @internal Not part of the public API. */
abstract class BaseSocketPoliciesGuard<Entity extends BaseEntity> extends BaseService<Entity> implements CanActivate {
  protected routeType: RouteType;
  protected abilityPredicate: AbilityPredicate<Entity> | undefined;
  /** @see BasePoliciesGuard.authAbilityPredicate */
  protected authAbilityPredicate: AuthAbilityPredicate<unknown> | undefined;
  protected predicateBehavior: PredicateBehavior | undefined;
  protected entity: Type<Entity>;
  protected queryToPipeline?: (query: unknown) => PipelineStage[];
  protected isPublic: boolean | undefined;

  private _logger: MongoDBDynamicApiLogger | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  private get logger(): MongoDBDynamicApiLogger {
    if (!this._logger) {
      this._logger = new MongoDBDynamicApiLogger(`SocketPoliciesGuard-${this.routeType}-${this.entity?.name}`);
    }
    return this._logger;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const [socket, data, _, _event] = context.getArgs();
    this.logger.debug('canActivate', {
      socketId: socket.id,
      socketUser: socket.user,
      data,
      event: _event,
      isPublic: this.isPublic,
      abilityPredicate: !!this.abilityPredicate,
    });

    if (!this.isPublic) {
      if (!socket.user) {
        this.logger.warn('No user data in socket');
        throw new WsException('Access Denied');
      }

      if (this.authAbilityPredicate && !this.authAbilityPredicate(socket.user, data)) {
        this.logger.warn('authAbilityPredicate denied access');
        throw new WsException('Access Denied');
      }

      if (this.abilityPredicate && this.predicateBehavior !== 'filter') {
        try {
          const { id } = data || {};

          if (id) {
            this.logger.debug(`Finding one document with id: ${id} and ability predicate`);
            await this.findOneDocumentWithAbilityPredicate(id, undefined, undefined, socket.user);
          } else if (this.routeType === 'Aggregate' && data && this.queryToPipeline) {
            this.logger.debug('Aggregating documents with ability predicate');
            await this.aggregateDocumentsWithAbilityPredicate(this.queryToPipeline(data), socket.user);
          } else {
            this.logger.debug('Finding many documents with ability predicate');
            await this.findManyDocumentsWithAbilityPredicate(buildAbilityPredicateFilter(data), socket.user);
          }
        } catch (error) {
          this.logger.error('Error in canActivate', error);
          throw new WsException(error.message);
        }
      }
    }

    return true;
  }
}

export { BasePoliciesGuard, BaseSocketPoliciesGuard };