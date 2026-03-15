import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

export class SocketAdapter extends IoAdapter {
  private ioServer: Server | null = null;

  createIOServer(
    port: number,
    options?: ServerOptions & {
      namespace?: string;
      server?: Server;
    },
  ): Server {
    if (!this.ioServer) {
      this.ioServer = super.createIOServer(port, { ...options, cors: true }) as Server;
    }

    return this.ioServer;
  }
}
