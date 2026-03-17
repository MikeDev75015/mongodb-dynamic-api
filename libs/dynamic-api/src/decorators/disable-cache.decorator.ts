import { SetMetadata } from '@nestjs/common';

const DISABLE_CACHE_KEY = 'dynamicApiDisableCache';
const DisableCache = () => SetMetadata(DISABLE_CACHE_KEY, true);

export { DISABLE_CACHE_KEY, DisableCache };

