import { Injectable } from '@nestjs/common';
import { PresenceAdapter } from '../../../interfaces';

/**
 * In-memory implementation of `PresenceAdapter`.
 *
 * Suitable for single-instance deployments or development.
 * Supports multi-tab users: each connection (socketId) is tracked individually;
 * a user is considered online as long as at least one socket is active.
 *
 * Data is kept entirely in two Maps — no external dependencies required.
 */
@Injectable()
export class InMemoryPresenceAdapter implements PresenceAdapter {
  /** userId → Set of active socketIds */
  private readonly socketsByUser = new Map<string, Set<string>>();
  /** socketId → roomId */
  private readonly roomBySocket = new Map<string, string>();

  async setOnline(userId: string, socketId: string, room?: string): Promise<void> {
    if (!this.socketsByUser.has(userId)) {
      this.socketsByUser.set(userId, new Set());
    }

    this.socketsByUser.get(userId)!.add(socketId);

    if (room) {
      this.roomBySocket.set(socketId, room);
    }
  }

  async setOffline(userId: string, socketId: string): Promise<void> {
    const sockets = this.socketsByUser.get(userId);

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.socketsByUser.delete(userId);
      }
    }

    this.roomBySocket.delete(socketId);
  }

  async isOnline(userId: string): Promise<boolean> {
    const sockets = this.socketsByUser.get(userId);
    return !!(sockets && sockets.size > 0);
  }

  async getOnlineUserIds(room?: string): Promise<string[]> {
    if (!room) {
      return Array.from(this.socketsByUser.keys());
    }

    const result: string[] = [];

    for (const [userId, sockets] of this.socketsByUser.entries()) {
      for (const socketId of sockets) {
        if (this.roomBySocket.get(socketId) === room) {
          result.push(userId);
          break;
        }
      }
    }

    return result;
  }

  async getSocketCount(userId: string): Promise<number> {
    return this.socketsByUser.get(userId)?.size ?? 0;
  }
}

