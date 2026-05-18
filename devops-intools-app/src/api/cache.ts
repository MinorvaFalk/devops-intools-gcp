import { get } from "./client";

const TTL = Number(import.meta.env.VITE_CACHE_TTL_MS ?? 5 * 60_000);

interface CacheEntry {
  data: unknown;
  ts: number;
}

const store = new Map<string, CacheEntry>();

export function cachedGet<T>(path: string): Promise<T> {
  const hit = store.get(path);
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data as T);
  return get<T>(path).then((data) => {
    store.set(path, { data, ts: Date.now() });
    return data;
  });
}

export function bustCache(path: string): void {
  store.delete(path);
}
