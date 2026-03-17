import { SetMetadata } from '@nestjs/common';

/** @deprecated Internal API — will be removed from public exports in v5. */
const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export { IS_PUBLIC_KEY, Public };
