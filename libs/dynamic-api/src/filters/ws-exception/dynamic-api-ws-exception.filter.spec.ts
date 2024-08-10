import { createMock } from '@golevelup/ts-jest';
import { ArgumentsHost, HttpException } from '@nestjs/common';
import { WsArgumentsHost } from '@nestjs/common/interfaces';
import { WsException } from '@nestjs/websockets';
import { DynamicAPIWsExceptionFilter } from './dynamic-api-ws-exception.filter';

describe('WsExceptionFilter', () => {
  let filter: DynamicAPIWsExceptionFilter<any>;

  beforeEach(() => {
    filter = new DynamicAPIWsExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
    expect(filter).toBeInstanceOf(DynamicAPIWsExceptionFilter);
    expect(filter).toHaveProperty('catch');
  });

  describe('catch', () => {
    const host = createMock<ArgumentsHost>();
    const client = { emit: jest.fn() };

    beforeEach(() => {
      host.switchToWs.mockReturnValue({ getClient: () => client } as WsArgumentsHost);
    });

    it('should call client.emit with default message', () => {
      const exception = new WsException('Test error');
      exception.message = undefined;

      filter.catch(exception, host);

      expect(client.emit).toHaveBeenCalledWith('exception', { message: 'An error occurred' });
    });

    it('should call client.emit with custom message', () => {
      const exception = new HttpException('Test error', 500);

      filter.catch(exception, host);

      expect(client.emit).toHaveBeenCalledWith('exception', { message: 'Test error' });
    });
  });
});
