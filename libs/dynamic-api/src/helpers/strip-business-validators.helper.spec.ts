import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { getMetadataStorage, IsEmail } from 'class-validator';
import * as classValidator from 'class-validator';
import { EntityExists } from '../decorators/entity-exists.decorator';
import { IsUnique } from '../decorators/is-unique.decorator';
import { BaseEntity } from '../models';
import { stripBusinessValidators } from './strip-business-validators.helper';

vi.mock('class-validator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('class-validator')>();
  return { ...actual, getMetadataStorage: vi.fn(actual.getMetadataStorage) };
});

class TargetEntity extends BaseEntity {
  email: string;
}

function metadataNamesFor(target: Function): (string | undefined)[] {
  return getMetadataStorage()
    .getTargetValidationMetadatas(target, '', false, false)
    .map((metadata) => metadata.name);
}

describe('stripBusinessValidators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when the target has no registered validation metadata', () => {
    class Empty {}

    expect(() => stripBusinessValidators(Empty)).not.toThrow();
    expect(metadataNamesFor(Empty)).toEqual([]);
  });

  it('removes IsUnique and EntityExists metadata while keeping other validators', () => {
    class Dto {
      @IsEmail()
      @IsUnique(TargetEntity)
      email: string;

      @EntityExists(TargetEntity)
      refId: string;
    }

    stripBusinessValidators(Dto);

    const names = metadataNamesFor(Dto);
    expect(names).toContain('isEmail');
    expect(names).not.toContain('isUnique');
    expect(names).not.toContain('entityExists');
  });

  it('only strips the validator names passed explicitly', () => {
    class Dto {
      @IsUnique(TargetEntity)
      email: string;

      @EntityExists(TargetEntity)
      refId: string;
    }

    stripBusinessValidators(Dto, ['isUnique']);

    const names = metadataNamesFor(Dto);
    expect(names).not.toContain('isUnique');
    expect(names).toContain('entityExists');
  });

  it('is a no-op when class-validator internals are not shaped as expected (defensive fallback)', () => {
    class Dto {
      @IsUnique(TargetEntity)
      email: string;
    }

    (classValidator.getMetadataStorage as Mock).mockReturnValueOnce(
      { validationMetadatas: {} } as unknown as ReturnType<typeof classValidator.getMetadataStorage>,
    );

    expect(() => stripBusinessValidators(Dto)).not.toThrow();
  });
});
