import { INestApplication } from '@nestjs/common';
import * as events from 'events';
import { SocketAdapter } from '../adapters/socket-adapter';
import { DynamicApiWebSocketOptions, DynamicApiWebSocketSetupOptions, GatewayOptions } from '../interfaces';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { DynamicApiEventRegistryStore } from './event-registry.store';
import { DynamicApiWsConfigStore } from './ws-config.store';

function initEventsListeners(maxListeners = 10) {
  // _maxListeners is a real but undocumented/untyped EventEmitter internal.
  (events.EventEmitter.prototype as unknown as { _maxListeners: number })._maxListeners = 100;
  events.EventEmitter.defaultMaxListeners = 100;
  events.EventEmitter.prototype.setMaxListeners(maxListeners);
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

  if (resolvedOptions.failOnEventCollision) {
    const collisions = DynamicApiEventRegistryStore.getCollisions();

    if (collisions.length) {
      const details = collisions
        .map(({ event, registrations }) => {
          const sources = registrations.map((r) => `${r.routeType}/${r.entityName}`).join(', ');
          return `"${event}" (${sources})`;
        })
        .join('; ');

      throw new Error(
        `[DynamicAPI] enableDynamicAPIWebSockets: broadcast event name collision detected: ${details}. `
        + 'Set a unique "eventName" on the conflicting routes, or disable failOnEventCollision.',
      );
    }
  }

  initEventsListeners(resolvedOptions.maxListeners);

  // Populate the static config store
  DynamicApiWsConfigStore.onConnection = resolvedOptions.onConnection;
  DynamicApiWsConfigStore.customEvents = resolvedOptions.customEvents ?? [];
  DynamicApiWsConfigStore.debug = resolvedOptions.debug ?? false;

  // Read jwtSecret from global state (may be undefined when auth is not configured)
  DynamicApiWsConfigStore.jwtSecret = DynamicApiGlobalStateService.getValue('jwtSecret');

  process.on('warning', function (err) {
    if ('MaxListenersExceededWarning' === err.name) {
      console.warn('\nTo fix the MaxListenersExceededWarning, you can increase the maxListeners');
      console.warn('by passing the value to the enableDynamicAPIWebSockets function as the second argument:\n');
      console.warn('>>> enableDynamicAPIWebSockets(app, { maxListeners: 15 });\n\n');
      throw new Error(
        'MaxListenersExceededWarning: too many listeners. '
        + 'Increase maxListeners via enableDynamicAPIWebSockets(app, { maxListeners: <value> }).',
      );
    }
  });

  app.useWebSocketAdapter(new SocketAdapter(app));
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function initializeConfigFromOptions(options?: DynamicApiWebSocketOptions): GatewayOptions | undefined {
  if (!options) {
    return;
  }

  return typeof options === 'boolean' ? {} : options;
}

export { initializeConfigFromOptions, enableDynamicAPIWebSockets };
