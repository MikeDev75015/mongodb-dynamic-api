import { Logger } from '@nestjs/common';
import * as process from 'node:process';

type MongoDBDynamicApiLoggerMethod = 'log' | 'error' | 'warn' | 'debug';
type MongoDBDynamicApiLogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

const logLevelsDictionary: Record<MongoDBDynamicApiLoggerMethod, MongoDBDynamicApiLogLevel[]> = {
  debug: ['DEBUG'],
  log: ['INFO', 'DEBUG'],
  warn: ['WARN', 'INFO', 'DEBUG'],
  error: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
}

export class MongoDBDynamicApiLogger extends Logger {
  private readonly isEnabled: boolean = !!process.env.MONGODB_DYNAMIC_API_LOGGER;
  private readonly logLevel: MongoDBDynamicApiLogLevel = (process.env.MONGODB_DYNAMIC_API_LOGGER || 'ERROR') as MongoDBDynamicApiLogLevel;

  constructor(context: string) {
    super(context);
  }

  debug(...args: Logger['debug']['arguments']): void {
    if (!this.isEnabled || !logLevelsDictionary['debug'].includes(this.logLevel)) {
      return;
    }

    // @ts-ignore
    super.debug(...args);
  }

  log(...args: Logger['log']['arguments']): void {
    if (!this.isEnabled || !logLevelsDictionary['log'].includes(this.logLevel)) {
      return;
    }

    // @ts-ignore
    super.log(...args);
  }

  warn(...args: Logger['warn']['arguments']): void {
    if (!this.isEnabled || !logLevelsDictionary['warn'].includes(this.logLevel)) {
      return;
    }

    // @ts-ignore
    super.warn(...args);
  }

  error(...args: Logger['error']['arguments']): void {
    if (!this.isEnabled || !logLevelsDictionary['error'].includes(this.logLevel)) {
      return;
    }

    // @ts-ignore
    super.error(...args);
  }
}