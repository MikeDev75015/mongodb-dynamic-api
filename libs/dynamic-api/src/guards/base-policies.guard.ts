import { CanActivate, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { AbilityPredicate, RouteType } from '../interfaces';
import { MongoDBDynamicApiLogger } from '../logger';
import { BaseEntity } from '../models';
import { BaseService } from '../services';

abstract class BasePoliciesGuard<Entity extends BaseEntity> extends BaseService<Entity> implements CanActivate {
  protected routeType: RouteType;
  protected entity: Type<Entity>;
  protected abilityPredicate: AbilityPredicate<Entity> | undefined;
  protected queryToPipeline?: (query: unknown) => PipelineStage[];

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, query, params } = context.switchToHttp().getRequest();

    if (this.abilityPredicate) {
      if (!user) {
        throw new ForbiddenException('Access Denied');
      }

      this.user = user;

      if (params?.id) {
        await this.findOneDocumentWithAbilityPredicate(params.id, query);
      } else if (this.routeType === 'Aggregate' && query && this.queryToPipeline) {
        await this.aggregateDocumentsWithAbilityPredicate(this.queryToPipeline(query));
      } else {
        await this.findManyDocumentsWithAbilityPredicate(query);
      }
    }

    return true;
  }
}

abstract class BaseSocketPoliciesGuard<Entity extends BaseEntity> extends BaseService<Entity> implements CanActivate {
  protected routeType: RouteType;
  protected abilityPredicate: AbilityPredicate<Entity> | undefined;
  protected entity: Type<Entity>;
  protected queryToPipeline?: (query: unknown) => PipelineStage[];
  protected isPublic: boolean | undefined;

  private logger: MongoDBDynamicApiLogger;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);

  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger = new MongoDBDynamicApiLogger(`SocketPoliciesGuard-${this.routeType}-${this.entity?.name}`);

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

      if (this.abilityPredicate) {
        try {
          this.user = socket.user;

          const { id } = data || {};

          if (id) {
            this.logger.debug(`Finding one document with id: ${id} and ability predicate`);
            await this.findOneDocumentWithAbilityPredicate(id);
          } else if (this.routeType === 'Aggregate' && data && this.queryToPipeline) {
            this.logger.debug('Aggregating documents with ability predicate');
            await this.aggregateDocumentsWithAbilityPredicate(this.queryToPipeline(data));
          } else {
            this.logger.debug('Finding many documents with ability predicate');
            await this.findManyDocumentsWithAbilityPredicate(data);
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