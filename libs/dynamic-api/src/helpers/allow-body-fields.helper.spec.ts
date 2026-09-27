import { describe, expect, it } from 'vitest';
import { IsString, validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { allowBodyFields } from './allow-body-fields.helper';

const strict = { whitelist: true, forbidNonWhitelisted: true };

describe('allowBodyFields', () => {
  it('should whitelist fields that carry no validator', async () => {
    class Body {
      @IsString()
      email: string;
    }
    allowBodyFields(Body, ['acceptedTerms']);

    const errors = await validate(plainToInstance(Body, { email: 'a@b.co', acceptedTerms: true }), strict);

    expect(errors).toEqual([]);
  });

  it('should keep the validators the DTO already has', async () => {
    class Body {
      @IsString()
      email: string;
    }
    allowBodyFields(Body, ['email']);

    const errors = await validate(plainToInstance(Body, { email: 42 }), strict);

    expect(errors.map(({ property }) => property)).toEqual(['email']);
  });

  it('should mark the fields optional when asked', async () => {
    class Body {
      @IsString()
      nickname?: string;
    }
    allowBodyFields(Body, ['nickname'], true);

    await expect(validate(plainToInstance(Body, {}), strict)).resolves.toEqual([]);
  });

  it('should still reject a field that was not allowed', async () => {
    class Body {}
    allowBodyFields(Body, ['deviceToken']);

    const errors = await validate(plainToInstance(Body, { role: 'admin' }), strict);

    expect(errors.map(({ property }) => property)).toEqual(['role']);
  });
});
