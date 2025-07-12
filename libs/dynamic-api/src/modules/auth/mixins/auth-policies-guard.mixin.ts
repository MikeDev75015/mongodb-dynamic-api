import { ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthAbilityPredicate, AuthPoliciesGuardConstructor } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { JwtSocketAuthGuard } from '../guards';

function AuthPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: AuthAbilityPredicate | undefined,
): AuthPoliciesGuardConstructor {
  @Injectable()
  class BaseAuthPoliciesGuard {
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;

    canActivate(context: ExecutionContext): boolean {
      const { user, body } = context.switchToHttp().getRequest();

      if (this.abilityPredicate && (
        !user || !this.abilityPredicate(user, body)
      )) {
        throw new ForbiddenException('Access denied');
      }

      return true;
    }
  }

  return BaseAuthPoliciesGuard;
}

function AuthSocketPoliciesGuardMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  abilityPredicate: AuthAbilityPredicate | undefined,
): AuthPoliciesGuardConstructor {
  @Injectable()
  class BaseAuthSocketPoliciesGuard extends JwtSocketAuthGuard {
    protected entity = entity;
    protected abilityPredicate = abilityPredicate;

    override async canActivate(context: ExecutionContext): Promise<boolean> {
      const [socket, data, _, _event] = context.getArgs();

      if (this.abilityPredicate) {
        const accessToken = this.getAccessTokenFromSocketQuery(socket);

        socket.user = await this.extractUserFromToken(accessToken);

        if (!socket.user || !this.abilityPredicate(socket.user, data)) {
          throw new WsException('Access denied');
        }
      }

      return true;
    }
  }

  return BaseAuthSocketPoliciesGuard;
}

export { AuthPoliciesGuardMixin, AuthSocketPoliciesGuardMixin };
