import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { Logger } from '@nestjs/common';
import { MongoDBDynamicApiLogger } from './mongo-dynamic-api.logger';

describe('MongoDynamicApiLogger', () => {
  let logger: MongoDBDynamicApiLogger;

  let nestLoggerDebugSpy: Mock;
  let nestLoggerLogSpy: Mock;
  let nestLoggerWarnSpy: Mock;
  let nestLoggerErrorSpy: Mock;
  const context = 'CustomLoggerContext';

  beforeEach(() => {
    nestLoggerLogSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation();
    nestLoggerDebugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation();
    nestLoggerWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation();
    nestLoggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    nestLoggerLogSpy.mockRestore();
    nestLoggerDebugSpy.mockRestore();
    nestLoggerWarnSpy.mockRestore();
    nestLoggerErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('DEBUG level', () => {
    beforeEach(() => {
      process.env.MONGODB_DYNAMIC_API_LOGGER = 'DEBUG';
      logger = new MongoDBDynamicApiLogger(context);
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');

      expect(nestLoggerDebugSpy).toHaveBeenCalledWith('Debug message');
    });

    it('should log info messages', () => {
      logger.log('Info message');

      expect(nestLoggerLogSpy).toHaveBeenCalledWith('Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');

      expect(nestLoggerWarnSpy).toHaveBeenCalledWith('Warn message');
    });

    it('should log error messages', () => {
      logger.error('Error message');

      expect(nestLoggerErrorSpy).toHaveBeenCalledWith('Error message');
    });
  });

  describe('INFO level', () => {
    beforeEach(() => {
      process.env.MONGODB_DYNAMIC_API_LOGGER = 'INFO';
      logger = new MongoDBDynamicApiLogger(context);
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');

      expect(nestLoggerDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.log('Info message');

      expect(nestLoggerLogSpy).toHaveBeenCalledWith('Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');

      expect(nestLoggerWarnSpy).toHaveBeenCalledWith('Warn message');
    });

    it('should log error messages', () => {
      logger.error('Error message');

      expect(nestLoggerErrorSpy).toHaveBeenCalledWith('Error message');
    });
  });

  describe('WARN level', () => {
    beforeEach(() => {
      process.env.MONGODB_DYNAMIC_API_LOGGER = 'WARN';
      logger = new MongoDBDynamicApiLogger(context);
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');

      expect(nestLoggerDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages', () => {
      logger.log('Info message');

      expect(nestLoggerLogSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');

      expect(nestLoggerWarnSpy).toHaveBeenCalledWith('Warn message');
    });

    it('should log error messages', () => {
      logger.error('Error message');

      expect(nestLoggerErrorSpy).toHaveBeenCalledWith('Error message');
    });
  });

  describe('ERROR level', () => {
    beforeEach(() => {
      process.env.MONGODB_DYNAMIC_API_LOGGER = 'ERROR';
      logger = new MongoDBDynamicApiLogger(context);
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');

      expect(nestLoggerDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages', () => {
      logger.log('Info message');

      expect(nestLoggerLogSpy).not.toHaveBeenCalled();
    });

    it('should not log warn messages', () => {
      logger.warn('Warn message');

      expect(nestLoggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');

      expect(nestLoggerErrorSpy).toHaveBeenCalledWith('Error message');
    });
  });
});
