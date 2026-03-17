import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Catch()
/** @deprecated Internal API — will be removed from public exports in v5. */
export class DynamicAPIWsExceptionFilter<T> implements ExceptionFilter {
  catch(exception: WsException | HttpException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();

    let message: string;

    if (exception instanceof WsException) {
      message = exception.message ?? 'An error occurred';
    } else {
      message = exception['response']?.message ?? exception.message;
    }

    client.emit('exception', { message });
  }
}
