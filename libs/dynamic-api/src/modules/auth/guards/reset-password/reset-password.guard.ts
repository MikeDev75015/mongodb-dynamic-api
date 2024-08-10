import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ResetPasswordGuard implements CanActivate {
  constructor(private readonly configured: boolean) {}

  canActivate(_context: ExecutionContext): boolean {
    if (!this.configured) {
      throw new ServiceUnavailableException('This feature is not available');
    }

    return true;
  }
}
