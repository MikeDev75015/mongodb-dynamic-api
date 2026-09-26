import { describe, expect, it } from 'vitest';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { DynamicApiValidationPipe } from './dynamic-api-validation.pipe';

class NoteBody {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;
}

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
});
