import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

export class TestSocketAdapter extends IoAdapter {
  private ioServer: Server | null = null;

  createIOServer(
    port: number,
    options?: ServerOptions & {
      namespace?: string;
      server?: any;
    },
  ): any {
    if (this.ioServer) {
      return this.ioServer;
    }

    this.ioServer = super.createIOServer(port, {
      ...options,
      cors: options?.cors ?? {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false,
      },
    }) as Server;

    this.ioServer.sockets.setMaxListeners(50);

    this.ioServer.on('connection', (socket) => {
      socket.setMaxListeners(50);
    });

    return this.ioServer;
  }
}

