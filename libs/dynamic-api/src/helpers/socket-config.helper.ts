import { INestApplication } from '@nestjs/common';
import { SocketAdapter } from '../adapters/socket-adapter';
import { DynamicApiWebSocketOptions, DynamicApiWebSocketSetupOptions, GatewayOptions } from '../interfaces';
import { DynamicApiWsConfigStore } from './ws-config.store';

function initEventsListeners(maxListeners = 10) {
  require('events').EventEmitter.prototype._maxListeners = 100;
  require('events').defaultMaxListeners = 100;
  require('events').EventEmitter.prototype.setMaxListeners(maxListeners);
}

/**
 * Enables WebSocket support for the Nest application.
 * @param {INestApplication} app The Nest application instance.
 * @param {DynamicApiWebSocketSetupOptions} options Setup options (maxListeners, onConnection, debug).
 */
function enableDynamicAPIWebSockets(app: INestApplication, options?: DynamicApiWebSocketSetupOptions): void;
/**
 * Enables WebSocket support for the Nest application.
 * @param {INestApplication} app The Nest application instance.
 * @param maxListeners The maximum number of listeners that can be added to an event.
 * @deprecated Pass an options object instead — `enableDynamicAPIWebSockets(app, { maxListeners })`. Will be removed in v5.
 */
function enableDynamicAPIWebSockets(app: INestApplication, maxListeners?: number): void;
function enableDynamicAPIWebSockets(
  app: INestApplication,
  optionsOrMaxListeners?: DynamicApiWebSocketSetupOptions | number,
): void {
  let resolvedOptions: DynamicApiWebSocketSetupOptions = {};

  if (typeof optionsOrMaxListeners === 'number') {
    console.warn(
      '[DynamicAPI] Passing a number to enableDynamicAPIWebSockets is deprecated. '
      + 'Use an options object instead: enableDynamicAPIWebSockets(app, { maxListeners: '
      + optionsOrMaxListeners
      + ' }). Will be removed in v5.',
    );
    resolvedOptions = { maxListeners: optionsOrMaxListeners };
  } else if (optionsOrMaxListeners) {
    resolvedOptions = optionsOrMaxListeners;
  }

  initEventsListeners(resolvedOptions.maxListeners);

  // Populate the static config store
  DynamicApiWsConfigStore.onConnection = resolvedOptions.onConnection;
  DynamicApiWsConfigStore.debug = resolvedOptions.debug ?? false;

  // Read jwtSecret from global state (may be undefined when auth is not configured)
  try {
    // Lazy-require to avoid circular dependency at module load time
    const { DynamicApiModule } = require('../dynamic-api.module');
    DynamicApiWsConfigStore.jwtSecret = DynamicApiModule.state.get('jwtSecret');
  } catch {
    // state not yet available – will be resolved later in the adapter
  }

  process.on('warning', function (err) {
    if ('MaxListenersExceededWarning' === err.name) {
      console.warn('\nTo fix the MaxListenersExceededWarning, you can increase the maxListeners');
      console.warn('by passing the value to the enableDynamicAPIWebSockets function as the second argument:\n');
      console.warn('>>> enableDynamicAPIWebSockets(app, { maxListeners: 15 });\n\n');
      process.exit(1);
    }
  });

  app.useWebSocketAdapter(new SocketAdapter(app));
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function initializeConfigFromOptions(options?: DynamicApiWebSocketOptions): GatewayOptions | undefined {
  if (!options) {
    return;
  }

  return typeof options === 'boolean' ? {} : options;
}

export { initializeConfigFromOptions, enableDynamicAPIWebSockets };
