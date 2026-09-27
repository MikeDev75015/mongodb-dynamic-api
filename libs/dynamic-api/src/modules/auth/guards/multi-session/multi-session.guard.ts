import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';

/** Gates the multi-session-only auth endpoints (`POST /auth/logout-all`, `auth-logout-all`). */
@Injectable()
export class MultiSessionGuard implements CanActivate {
  constructor(private readonly enabled: boolean) {}

  canActivate(_context: ExecutionContext): boolean {
    if (!this.enabled) {
      throw new ServiceUnavailableException('This feature is not available');
    }

    return true;
  }
}
