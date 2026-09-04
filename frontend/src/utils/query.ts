/**
 * Prunes undefined, null, and empty string values from parameter objects,
 * and sorts object keys to guarantee deterministic React Query key serialization.
 *
 * This ensures consumers like Dashboard, Navbar, and individual Pages share
 * identical cache entries even when some parameters are passed as undefined.
 */
export function normalizeQueryParams<T extends Record<string, unknown>>(params?: T): Record<string, unknown> {
  if (!params || typeof params !== 'object') return {};

  const cleaned: Record<string, unknown> = {};
  const keys = Object.keys(params).sort();

  for (const key of keys) {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = normalizeQueryParams(val as Record<string, unknown>);
      } else {
        cleaned[key] = val;
      }
    }
  }

  return cleaned;
}
