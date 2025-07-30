import { cache } from 'swr/_internal';
import { mutate } from 'swr';

export function clearSessionCache() {
  mutate('templates', null, false);
  mutate('rpc:contacts-with-groups', null, false);
  mutate('recent-purchases', null, false);

  // Dynamically clear all `/api/metrics?...` keys
  for (const key of cache.keys()) {
    if (typeof key === 'string' && key.startsWith('/api/metrics')) {
      mutate(key, null, false);
    }
  }
}
