import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Copies the `:id` route param onto `request.body.id` before NestJS's `ValidationPipe` runs.
 *
 * On `UpdateOne`, the current entity's id lives in the URL (`PATCH /entity/:id`), never in the
 * body — but `@IsUnique(Entity, { ignoreId: 'id' })` (self-exclusion on update) can only read a
 * property already present on the DTO instance being validated. Guards and interceptors run
 * before pipes in Nest's request lifecycle, so mutating `request.body` here — inside this
 * interceptor's pre-handler phase, before `next.handle()` — makes the id available to the
 * `ValidationPipe` that validates `@Body()` right after, with no DTO plumbing required.
 *
 * Always overwrites any client-supplied `id` in the body: the current entity's id is derived
 * from the URL, never client-controlled.
 *
 * @internal Not part of the public API — will be removed from the package's public exports in v5.
 */
@Injectable()
class MergeIdParamInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (request?.body && typeof request.body === 'object' && request.params?.id !== undefined) {
      request.body.id = request.params.id;
    }

    return next.handle();
  }
}

export { MergeIdParamInterceptor };
