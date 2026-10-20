/**
 * Photos people upload (book F-084, F-101, Q-115): a business's gallery (the first is its cover everywhere), a team
 * member's picture, a person's own. The apps make them smaller before they send them.
 */

/** Each photo at most (10 MB). */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024
/** A business's gallery at most; 3 or more are recommended. */
export const GALLERY_MAX = 20

/** The kinds of photo taken, by what their first bytes say (not by what the browser claims). */
export const PHOTO_KINDS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const
export type PhotoKind = keyof typeof PHOTO_KINDS

/** A photo's kind from its first bytes: JPEG, PNG or WebP; null for anything else. */
export function photoKind(bytes: Uint8Array): PhotoKind | null {
  const at = (i: number, ...b: number[]) => b.every((x, j) => bytes[i + j] === x)
  if (at(0, 0xff, 0xd8, 0xff)) return 'jpg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png'
  // "RIFF" … "WEBP"
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'webp'
  return null
}
