import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class TestSocketAdapter extends IoAdapter {
  createIOServer(
    port: number,
    options?: ServerOptions & {
      namespace?: string;
      server?: any;
    },
  ): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: options?.cors ?? {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false,
      },
    });

    server.sockets.setMaxListeners(50);

    server.on('connection', (socket) => {
      socket.setMaxListeners(50);
    });

    return server;
  }
}

