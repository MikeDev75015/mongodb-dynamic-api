import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { VerifyOtpCodeDto } from './verify-otp-code.dto';

describe('VerifyOtpCodeDto', () => {
  it.each([
    ['valid inputs', { identifier: 'user@example.com', code: '123456' }, 0],
    ['missing both', {}, 2],
    ['missing identifier', { code: '123456' }, 1],
    ['missing code', { identifier: 'user@example.com' }, 1],
    ['empty identifier', { identifier: '', code: '123456' }, 1],
    ['empty code', { identifier: 'user@example.com', code: '' }, 1],
    ['code too short (5 chars)', { identifier: 'user@example.com', code: '12345' }, 1],
    ['code too long (7 chars)', { identifier: 'user@example.com', code: '1234567' }, 1],
    ['non-string code', { identifier: 'user@example.com', code: 123456 }, 1],
  ])('%s should have %i validation error(s)', async (_label, input, expectedErrors) => {
    const dto = plainToInstance(VerifyOtpCodeDto, input);
    const errors = await validate(dto);
    expect(errors.length).toBe(expectedErrors);
  });
});

