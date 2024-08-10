import { SocketAdapter } from './socket-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';

describe('SocketAdapter', () => {
  let adapter: SocketAdapter;
  const fakeServer = { on: jest.fn() };

  beforeEach(() => {
    adapter = new SocketAdapter();
    jest.spyOn(IoAdapter.prototype, 'createIOServer').mockImplementation(() => fakeServer);
  });

  it('should create', () => {
    expect(adapter).toBeTruthy();
  });

  describe ('createIOServer', () => {
    it('should create a new server', () => {
      const server = adapter.createIOServer(5000);
      expect(server).toStrictEqual(fakeServer);
    });
  });
});
