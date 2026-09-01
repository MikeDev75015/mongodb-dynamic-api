import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Builds a Swagger-only wrapper DTO class for a paginated `Aggregate` route response:
 * `{ list: Presenter[], count: number, totalPage: number }`.
 *
 * `AggregateControllerMixin`/`AggregateGatewayMixin` already return this exact shape at runtime
 * whenever the route's presenter implements a static `fromAggregate(list, count, totalPage)` (see
 * `fromAggregate` on `Mappable`) — but nothing told Swagger about it: `ApiResponse` always
 * documented a bare `Presenter`/`Presenter[]`, so every OpenAPI client generated against a
 * paginated `Aggregate` route received a wrong response type. This wrapper exists purely for that
 * Swagger documentation; it is never instantiated or returned at runtime.
 *
 * @internal Not part of the public API — will be removed from the package's public exports in v5.
 */
function buildPaginatedResponseType(presenter: Type): Type {
  class PaginatedResponse {
    @ApiProperty({ type: [presenter] })
    list: InstanceType<typeof presenter>[];

    @ApiProperty()
    count: number;

    @ApiProperty()
    totalPage: number;
  }

  Object.defineProperty(PaginatedResponse, 'name', {
    value: `Paginated${presenter.name}`,
    writable: false,
  });

  return PaginatedResponse;
}

export { buildPaginatedResponseType };
