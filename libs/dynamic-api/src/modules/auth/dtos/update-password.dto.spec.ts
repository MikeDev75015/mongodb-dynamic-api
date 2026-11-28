import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePasswordDto } from './update-password.dto';

describe('UpdatePasswordDto', () => {
  it.each([
    ['valid inputs', { currentPassword: 'old-pass', newPassword: 'new-pass' }, 0],
    ['missing both', {}, 2],
    ['missing currentPassword', { newPassword: 'new-pass' }, 1],
    ['missing newPassword', { currentPassword: 'old-pass' }, 1],
    ['empty currentPassword', { currentPassword: '', newPassword: 'new-pass' }, 1],
    ['empty newPassword', { currentPassword: 'old-pass', newPassword: '' }, 1],
    ['non-string currentPassword', { currentPassword: 123, newPassword: 'new-pass' }, 1],
    ['non-string newPassword', { currentPassword: 'old-pass', newPassword: 123 }, 1],
  ])('%s should have %i validation error(s)', async (_label, input, expectedErrors) => {
    const dto = plainToInstance(UpdatePasswordDto, input);
    const errors = await validate(dto);
    expect(errors).toHaveLength(expectedErrors);
  });
});
