import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SendOtpCodeDto } from './send-otp-code.dto';

describe('SendOtpCodeDto', () => {
  it.each([
    ['valid identifier', { identifier: 'user@example.com' }, 0],
    ['missing identifier', {}, 1],
    ['empty identifier', { identifier: '' }, 1],
    ['non-string identifier', { identifier: 42 }, 1],
  ])('%s should have %i validation error(s)', async (_label, input, expectedErrors) => {
    const dto = plainToInstance(SendOtpCodeDto, input);
    const errors = await validate(dto);
    expect(errors.length).toBe(expectedErrors);
  });
});

