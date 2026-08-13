import { Type } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';

/**
 * Validator `name`s registered by MDA's own DB-aware business validators — the ones
 * {@link stripBusinessValidators} strips by default.
 */
const BUSINESS_VALIDATOR_NAMES = ['isUnique', 'entityExists'];

/**
 * Removes DB-aware business validators (`IsUnique`/`EntityExists` by default) that class-validator's
 * mapped-type helpers (`PickType`/`IntersectionType`/`PartialType`) copy verbatim onto a derived DTO,
 * for DTOs where re-running those checks makes no sense — e.g. the auth mixins' login DTO, which
 * picks the login field's decorators purely to validate its shape, not to re-check uniqueness
 * against the very account that's logging in.
 *
 * Mutates class-validator's shared metadata storage, but scoped to `target` only — every other
 * class registered against that storage (including the source entity the DTO was picked from) is
 * left untouched.
 *
 * @internal Not part of the public API — will be removed from the package's public exports in v5.
 */
function stripBusinessValidators(
  target: Type<object>,
  validatorNames: string[] = BUSINESS_VALIDATOR_NAMES,
): void {
  const { validationMetadatas } = getMetadataStorage() as unknown as {
    validationMetadatas: Map<Type<object>, { name?: string }[]>;
  };

  if (!(validationMetadatas instanceof Map)) {
    return;
  }

  const metadatas = validationMetadatas.get(target);

  if (!metadatas?.length) {
    return;
  }

  validationMetadatas.set(
    target,
    metadatas.filter((metadata) => !validatorNames.includes(metadata.name as string)),
  );
}

export { stripBusinessValidators };
