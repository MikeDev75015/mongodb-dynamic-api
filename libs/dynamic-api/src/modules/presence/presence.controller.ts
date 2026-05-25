import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../decorators';
import {
  DYNAMIC_API_PRESENCE_ADAPTER,
  PresenceAdapter,
  PresenceResponse,
} from '../../interfaces';

/**
 * Optional HTTP endpoint that exposes the current presence state.
 *
 * Enabled by passing `enableController: true` to `DynamicApiPresenceModule.register()`.
 *
 * The route is decorated with `@Public()` so it remains accessible even when the
 * `DynamicApiJwtAuthGuard` global guard is active.
 *
 * Routes:
 *  - `GET /presence`           — returns all online user IDs.
 *  - `GET /presence?room=xxx`  — returns online user IDs in a specific room.
 */
@ApiTags('Presence')
@Controller('presence')
export class PresenceController {
  constructor(
    @Inject(DYNAMIC_API_PRESENCE_ADAPTER)
    private readonly presenceAdapter: PresenceAdapter,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get online user IDs (optionally filtered by room)' })
  @ApiQuery({ name: 'room', required: false, type: String })
  @ApiOkResponse({
    description: 'List of online user IDs.',
    schema: {
      type: 'object',
      properties: {
        onlineUserIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getOnlineUsers(@Query('room') room?: string): Promise<PresenceResponse> {
    const onlineUserIds = await this.presenceAdapter.getOnlineUserIds(room);
    return { onlineUserIds };
  }
}

