import { Type } from '@nestjs/common';
import { Allow, IsOptional } from 'class-validator';

/**
 * Whitelists `fields` on `dto`, so a `whitelist` + `forbidNonWhitelisted` body pipe accepts them
 * even when the entity declares them with `@Prop()` alone (or not at all, e.g. a register
 * `additionalFields` entry only read by `beforeSaveCallback`). Validators the DTO already carries
 * for these fields keep applying. `optional` also marks them `@IsOptional()`.
 * @internal Not part of the public API.
 */
function allowBodyFields(dto: Type<unknown>, fields: PropertyKey[], optional = false): void {
  for (const field of fields) {
    const propertyName = String(field);
    Allow()(dto.prototype, propertyName);

    if (optional) {
      IsOptional()(dto.prototype, propertyName);
    }
  }
}

export { allowBodyFields };
