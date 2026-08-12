import { SetMetadata } from '@nestjs/common';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export { IS_PUBLIC_KEY, Public };
