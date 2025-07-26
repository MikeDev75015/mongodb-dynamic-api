import { Logger } from '@nestjs/common';
import { MongoDBDynamicApiLogger } from './mongo-dynamic-api.logger';

describe('MongoDynamicApiLogger', () => {
  let logger: MongoDBDynamicApiLogger;

  let nestLoggerDebugSpy: jest.SpyInstance;
  let nestLoggerLogSpy: jest.SpyInstance;
  let nestLoggerWarnSpy: jest.SpyInstance;
  let nestLoggerErrorSpy: jest.SpyInstance;
  const context = 'CustomLoggerContext';

  beforeEach(() => {
    nestLoggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    nestLoggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    nestLoggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    nestLoggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    nestLoggerLogSpy.mockRestore();
    nestLoggerDebugSpy.mockRestore();
    nestLoggerWarnSpy.mockRestore();
    nestLoggerErrorSpy.mockRestore();
    jest.clearAllMocks();
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
