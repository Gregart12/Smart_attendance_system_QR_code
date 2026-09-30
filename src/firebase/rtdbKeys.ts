/**
 * Pure helpers for the Realtime Database data layer.
 *
 * Kept free of Firebase imports so the escaping and write-sanitising rules can
 * be unit tested without booting the SDK.
 */

/** Characters the Realtime Database refuses inside a key. */
const isForbiddenKeyChar = (char: string): boolean =>
  char === '.' ||
  char === '#' ||
  char === '$' ||
  char === '[' ||
  char === ']' ||
  char === '/' ||
  char.charCodeAt(0) < 0x20 ||
  char.charCodeAt(0) === 0x7f;

/**
 * Escapes a single path segment.
 *
 * `accountEmails` is keyed by email and `staffIds` by staff ID, both of which
 * contain characters RTDB rejects (`.` in emails, `/` in IDs like
 * `IT/2026/1042`). Escaping here - rather than at each call site - keeps every
 * read and write of those nodes symmetric.
 */
export const encodeKey = (segment: string): string => {
  let out = '';
  for (const char of segment) {
    if (isForbiddenKeyChar(char)) {
      out += `_${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}_`;
    } else {
      out += char;
    }
  }
  return out;
};

/** Reverses {@link encodeKey}. */
export const decodeKey = (key: string): string =>
  key.replace(/_([0-9A-F]{2})_/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));

/** Joins path segments, dropping empty ones and escaping the rest. */
export const encodePath = (segments: string[]): string =>
  segments
    .filter((segment) => segment !== undefined && segment !== null && segment !== '')
    .map(encodeKey)
    .join('/');

/**
 * Removes `undefined` and function values, which RTDB rejects outright. Nested
 * objects are walked so optional fields deeper inside a record are handled too.
 * This matches Firestore, which simply omits those fields.
 */
export const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    // Array holes cannot be omitted without shifting indices, so an undefined
    // entry becomes null, which RTDB accepts.
    return value.map((entry) => {
      const cleaned = sanitize(entry);
      return cleaned === undefined ? null : cleaned;
    });
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined || typeof entry === 'function') continue;
      const cleaned = sanitize(entry);
      if (cleaned === undefined) continue;
      out[key] = cleaned;
    }
    return out;
  }

  return value;
};
