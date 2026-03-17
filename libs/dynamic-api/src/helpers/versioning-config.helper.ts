import { INestApplication, VersioningOptions, VersioningType } from '@nestjs/common';

/** @deprecated Internal API — will be removed from public exports in v5. */
function enableDynamicAPIVersioning(
  app: INestApplication,
  options?: VersioningOptions,
) {
  app.enableVersioning({
    type: VersioningType.URI,
    ...options,
  });
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function addVersionSuffix(version?: string) {
  return version ? `V${version}` : '';
}

export { addVersionSuffix, enableDynamicAPIVersioning };
