import { Controller, Get, HttpCode, HttpStatus, Inject, ServiceUnavailableException, Type } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { Public } from '../../decorators';
import { DynamicApiHealthCheckResponse } from '../../interfaces';

/**
 * Builds the `GET /<path>` health-check controller for a given Mongoose connection name.
 * A factory (rather than a static class) because the connection-name injection token is only
 * known once `DynamicApiModule.forRoot()` has run.
 * @internal Not part of the public API.
 */
function createHealthController(connectionName: string, path: string): Type {
  @ApiTags('Health')
  @Controller(path)
  class HealthController {
    constructor(
      @Inject(getConnectionToken(connectionName))
      private readonly connection: Connection,
    ) {}

    /**
     * `@Public()` because a readiness probe must stay reachable even when the global
     * `DynamicApiJwtAuthGuard` is active — an orchestrator polling this route never carries a JWT.
     */
    @Public()
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Readiness probe — reports the MongoDB connection status' })
    @ApiOkResponse({ description: 'The MongoDB connection is up.' })
    @ApiServiceUnavailableResponse({ description: 'The MongoDB connection is down.' })
    async check(): Promise<DynamicApiHealthCheckResponse> {
      // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting.
      const isUp = this.connection.readyState === 1;

      if (!isUp) {
        throw new ServiceUnavailableException(
          { status: 'error', mongo: 'down' } as DynamicApiHealthCheckResponse,
        );
      }

      return { status: 'ok', mongo: 'up' };
    }
  }

  return HealthController;
}

export { createHealthController };
