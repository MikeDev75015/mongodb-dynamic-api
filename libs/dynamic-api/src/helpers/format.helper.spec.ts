import { isValidVersion, pascalCase } from './format.helper';

describe('FormatHelper', () => {
  describe('pascalCase', () => {
    it('should return undefined when no string is provided', () => {
      expect(pascalCase()).toBeUndefined();
    });

    test.each([
      ['test string', 'TestString'],
      [' test-string', 'TestString'],
      ['test  string ', 'TestString'],
      ['TEST_STRING', 'TestString'],
    ])('should return %s converted to pascal case string "%s"', (input, expected) => {
      expect(pascalCase(input)).toBe(expected);
    });
  });

  describe('isValidVersion', () => {
    it('should return true for valid version', () => {
      expect(isValidVersion('1')).toBe(true);
    });

    it('should return false for invalid version', () => {
      expect(isValidVersion('v1')).toBe(false);
    });
  });
});
