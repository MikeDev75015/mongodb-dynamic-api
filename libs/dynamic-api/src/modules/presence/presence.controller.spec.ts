import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../decorators';
import { DYNAMIC_API_PRESENCE_ADAPTER } from '../../interfaces';
import { PresenceController } from './presence.controller';

describe('PresenceController', () => {
  let controller: PresenceController;

  const mockAdapter = {
    getOnlineUserIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenceController],
      providers: [
        { provide: DYNAMIC_API_PRESENCE_ADAPTER, useValue: mockAdapter },
      ],
    }).compile();

    controller = module.get<PresenceController>(PresenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have @Public() on getOnlineUsers so the global JWT guard does not block it', () => {
    const reflector = new Reflector();
    const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, controller.getOnlineUsers);
    expect(isPublic).toBe(true);
  });

  describe('getOnlineUsers', () => {
    it('should return all online user IDs when no room filter is provided', async () => {
      mockAdapter.getOnlineUserIds.mockResolvedValue(['u1', 'u2']);

      const result = await controller.getOnlineUsers();

      expect(result).toEqual({ onlineUserIds: ['u1', 'u2'] });
      expect(mockAdapter.getOnlineUserIds).toHaveBeenCalledWith(undefined);
    });

    it('should pass room param to adapter when provided', async () => {
      mockAdapter.getOnlineUserIds.mockResolvedValue(['u3']);

      const result = await controller.getOnlineUsers('room-A');

      expect(result).toEqual({ onlineUserIds: ['u3'] });
      expect(mockAdapter.getOnlineUserIds).toHaveBeenCalledWith('room-A');
    });

    it('should return empty array when no users are online', async () => {
      mockAdapter.getOnlineUserIds.mockResolvedValue([]);

      const result = await controller.getOnlineUsers();

      expect(result).toEqual({ onlineUserIds: [] });
    });

    it('should propagate adapter errors', async () => {
      mockAdapter.getOnlineUserIds.mockRejectedValue(new Error('adapter error'));

      await expect(controller.getOnlineUsers()).rejects.toThrow('adapter error');
    });
  });
});

