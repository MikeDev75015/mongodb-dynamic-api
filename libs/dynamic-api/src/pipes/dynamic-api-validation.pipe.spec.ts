import { describe, expect, it } from 'vitest';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Exclude, Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { DynamicApiValidationPipe, toPlainInput } from './dynamic-api-validation.pipe';

class NoteBody {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;
}

class RegisterBody {
  @IsString()
  email: string;

  @IsString()
  @Exclude({ toPlainOnly: true })
  password: string;

  @IsOptional()
  @Transform(({ value }) => `out-${value}`, { toPlainOnly: true })
  nickname?: string;
}

const registerMetadata: ArgumentMetadata = { type: 'body', metatype: RegisterBody };
const bodyMetadata: ArgumentMetadata = { type: 'body', metatype: NoteBody };
const queryMetadata: ArgumentMetadata = { type: 'query', metatype: NoteBody };

describe('DynamicApiValidationPipe', () => {
  it('should reject undeclared body properties by default', async () => {
    const pipe = new DynamicApiValidationPipe();

    await expect(pipe.transform({ title: 'groceries', ownerId: 'someone-else' }, bodyMetadata))
      .rejects.toThrow(BadRequestException);
  });

  it('should accept a body with declared properties only', async () => {
    const pipe = new DynamicApiValidationPipe();

    await expect(pipe.transform({ title: 'groceries' }, bodyMetadata)).resolves.toEqual({ title: 'groceries' });
  });

  it('should let the given options override the body defaults', async () => {
    const pipe = new DynamicApiValidationPipe({ forbidNonWhitelisted: false });

    await expect(pipe.transform({ title: 'groceries', extra: 'x' }, bodyMetadata))
      .resolves.toEqual({ title: 'groceries' });
  });

  it('should not apply the body defaults to queries', async () => {
    const pipe = new DynamicApiValidationPipe();

    await expect(pipe.transform({ title: 'groceries', ownerId: 'u1' }, queryMetadata))
      .resolves.toEqual({ title: 'groceries', ownerId: 'u1' });
  });

  it('should still validate declared query properties', async () => {
    const pipe = new DynamicApiValidationPipe();

    await expect(pipe.transform({ title: 42 }, queryMetadata)).rejects.toThrow(BadRequestException);
  });

  describe('validated body output', () => {
    it.each([
      ['the strict defaults', {}],
      ['whitelist disabled', { whitelist: false, forbidNonWhitelisted: false }],
    ])('should keep @Exclude({ toPlainOnly }) properties and skip output transforms with %s', async (_, options) => {
      const pipe = new DynamicApiValidationPipe(options);

      const result = await pipe.transform({ email: 'a@b.co', password: 'secret', nickname: 'nick' }, registerMetadata);

      expect(result).toEqual({ email: 'a@b.co', password: 'secret', nickname: 'nick' });
      expect(result).not.toBeInstanceOf(RegisterBody);
    });

    it('should strip undeclared properties when forbidNonWhitelisted is off', async () => {
      const pipe = new DynamicApiValidationPipe({ forbidNonWhitelisted: false });

      await expect(pipe.transform({ email: 'a@b.co', password: 'secret', extra: 1 }, registerMetadata))
      .resolves.toEqual({ email: 'a@b.co', password: 'secret' });
    });

    it('should return the validated instance when transform is true', async () => {
      const pipe = new DynamicApiValidationPipe({ transform: true });

      const result = await pipe.transform({ email: 'a@b.co', password: 'secret' }, registerMetadata);

      expect(result).toBeInstanceOf(RegisterBody);
      expect(result).toEqual(expect.objectContaining({ password: 'secret' }));
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
    ])('should hand a %s body back as is', async (_, value) => {
      const pipe = new DynamicApiValidationPipe();

      await expect(pipe.transform(value, { type: 'body', metatype: NoteBodyOptional })).resolves.toBe(value);
    });

    it.each([
      ['has no metatype', { type: 'body' } as ArgumentMetadata, { any: 'thing' }],
      ['is a primitive type', { type: 'body', metatype: String } as ArgumentMetadata, 'raw'],
    ])('should return the value untouched when the body %s', async (_, metadata, value) => {
      const pipe = new DynamicApiValidationPipe();

      await expect(pipe.transform(value, metadata)).resolves.toBe(value);
    });
  });
});

describe('toPlainInput', () => {
  class Inner {
    constructor(public label: string) {}
  }

  it('should copy nested instances and arrays into plain objects', () => {
    const date = new Date();
    const map = new Map([['a', 1]]);
    const set = new Set([1]);

    const result = toPlainInput({ list: [new Inner('x'), 2], inner: new Inner('y'), date, map, set, none: null });

    expect(result).toEqual({ list: [{ label: 'x' }, 2], inner: { label: 'y' }, date, map, set, none: null });
    expect((result as { inner: object }).inner).not.toBeInstanceOf(Inner);
    expect((result as { date: Date }).date).toBe(date);
  });

  it('should drop a constructor own property pinned by Nest', () => {
    const entity = Object.assign(new Inner('x'), { constructor: Inner });

    expect(toPlainInput(entity)).toEqual({ label: 'x' });
  });
});

class NoteBodyOptional {
  @IsOptional()
  @IsString()
  title?: string;
}
