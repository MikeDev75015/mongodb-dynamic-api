import { INestApplication, VersioningOptions, VersioningType } from '@nestjs/common';

function enableDynamicAPIVersioning(
  app: INestApplication,
  options?: VersioningOptions,
) {
  app.enableVersioning({
    type: VersioningType.URI,
    ...options,
  });
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function addVersionSuffix(version?: string) {
  return version ? `V${version}` : '';
}

export { addVersionSuffix, enableDynamicAPIVersioning };
