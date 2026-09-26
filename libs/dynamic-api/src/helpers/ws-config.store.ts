import { CustomSocketEventConfig, ExtendedSocket } from '../interfaces';

/**
 * Static store for WebSocket configuration values.
 * Populated by `enableDynamicAPIWebSockets` and consumed by the socket adapter and gateways.
 * @internal Not part of the public API.
 */
export class DynamicApiWsConfigStore {
  static onConnection: ((socket: ExtendedSocket, user?: unknown) => void | Promise<void>) | undefined;
  static customEvents: CustomSocketEventConfig[] = [];
  static debug = false;
  static jwtSecret: string | undefined;
  private static rejectInvalidTokenValue = true;

  static get rejectInvalidToken(): boolean {
    return this.rejectInvalidTokenValue;
  }

  static set rejectInvalidToken(value: boolean) {
    this.rejectInvalidTokenValue = value;
  }

  /** Reset all values — useful for testing. */
  static reset(): void {
    this.onConnection = undefined;
    this.customEvents = [];
    this.debug = false;
    this.jwtSecret = undefined;
    this.rejectInvalidToken = true;
  }
}

