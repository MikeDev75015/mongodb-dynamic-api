import { INestApplication } from '@nestjs/common';
import { SocketAdapter } from '../adapters/socket-adapter';
import { DynamicApiWebSocketOptions, GatewayOptions } from '../interfaces';

function initEventsListeners(maxListeners = 10) {
  require('events').EventEmitter.prototype._maxListeners = 100;
  require('events').defaultMaxListeners = 100;
  require('events').EventEmitter.prototype.setMaxListeners(maxListeners);
}

/**
 * Enables WebSocket support for the Nest application.
 * @param {INestApplication} app The Nest application instance.
 * @param maxListeners The maximum number of listeners that can be added to an event.
 */
function enableDynamicAPIWebSockets(app: INestApplication, maxListeners?: number) {
  initEventsListeners(maxListeners);

  process.on('warning', function (err) {
    if ('MaxListenersExceededWarning' == err.name) {
      console.warn('\nTo fix the MaxListenersExceededWarning, you can increase the maxListeners');
      console.warn('by passing the value to the enableDynamicAPIWebSockets function as the second argument:\n');
      console.warn('>>> enableDynamicAPIWebSockets(app, 15);\n\n');
      process.exit(1);
    }
  });

  app.useWebSocketAdapter(new SocketAdapter(app));
}

function initializeConfigFromOptions(options?: DynamicApiWebSocketOptions): GatewayOptions | undefined {
  if (!options) {
    return;
  }

  return typeof options === 'boolean' ? {} : options;
}

export { initializeConfigFromOptions, enableDynamicAPIWebSockets };
