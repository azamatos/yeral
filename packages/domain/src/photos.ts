/**
 * Photos people upload (book F-084, F-101, Q-115): a business's gallery (the first is its cover everywhere), a team
 * member's picture, a person's own. The apps make them smaller before they send them.
 */

/** Each photo at most (10 MB, as the edge counts them; it lets the form's few bytes more through). */
export const PHOTO_MAX_BYTES = 10_000_000
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

/**
 * The photo without what it says about where, when and with what it was taken (book F-101): a phone's EXIF (GPS among
 * it), XMP, IPTC, comments and the pictures some phones add after the photo go; a JPEG keeps its orientation, so it
 * still shows the right way up, and its colour profile. Null for anything that isn't a whole JPEG, PNG or WebP.
 */
export function cleanPhoto(bytes: Uint8Array): { kind: PhotoKind; bytes: Uint8Array<ArrayBuffer> } | null {
  const kind = photoKind(bytes)
  const clean = kind === 'jpg' ? cleanJpeg(bytes) : kind === 'png' ? cleanPng(bytes) : kind === 'webp' ? cleanWebp(bytes) : null
  return kind && clean ? { kind, bytes: clean } : null
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
/** The bytes at `at` spell `text`, then a zero byte when `zero`. */
const spells = (b: Uint8Array, at: number, text: string, zero = false) =>
  [...text].every((ch, i) => b[at + i] === ch.charCodeAt(0)) && (!zero || b[at + text.length] === 0)

/**
 * A JPEG's segments: the tables, the frame and the scans stay; of the APPn only JFIF (APP0), the colour profile (APP2
 * `ICC_PROFILE`) and Adobe's colour transform (APP14); the EXIF becomes its orientation alone; it ends at the image's
 * end marker.
 */
function cleanJpeg(b: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const out: Uint8Array[] = [b.subarray(0, 2)]
  let oriented = false
  let i = 2
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1]!
    // fill before a marker
    if (marker === 0xff) {
      i++
      continue
    }
    if (marker === 0xd9) return concat([...out, b.subarray(i, i + 2)])
    // markers without a length
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      out.push(b.subarray(i, i + 2))
      i += 2
      continue
    }
    if (i + 4 > b.length) return null
    const end = i + 2 + ((b[i + 2]! << 8) | b[i + 3]!)
    if (end < i + 4 || end > b.length) return null
    const body = b.subarray(i + 4, end)
    const app = marker >= 0xe0 && marker <= 0xef
    const keep = app ? marker === 0xe0 || marker === 0xee || (marker === 0xe2 && spells(body, 0, 'ICC_PROFILE', true)) : marker !== 0xfe
    if (keep) out.push(b.subarray(i, end))
    else if (marker === 0xe1 && !oriented && spells(body, 0, 'Exif', true) && body[5] === 0) {
      const o = orientationOf(body.subarray(6))
      if (o) out.push(orientationSegment(o))
      oriented = true
    }
    i = end
    // a scan's data runs to the next marker (0xFF 0x00 is a data byte, 0xFF 0xD0–0xD7 a restart)
    if (marker === 0xda) {
      let j = i
      while (j + 1 < b.length && !(b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1]! >= 0xd0 && b[j + 1]! <= 0xd7))) j++
      out.push(b.subarray(i, j))
      i = j
    }
  }
  return null
}

/** The EXIF's orientation (2–8; 1, the default, or none is null), from its TIFF header and first directory. */
function orientationOf(tiff: Uint8Array): number | null {
  const le = spells(tiff, 0, 'II')
  if ((!le && !spells(tiff, 0, 'MM')) || tiff.length < 8) return null
  const u16 = (at: number) => (le ? tiff[at]! | (tiff[at + 1]! << 8) : (tiff[at]! << 8) | tiff[at + 1]!)
  const u32 = (at: number) => (le ? u16(at) + u16(at + 2) * 0x10000 : u16(at) * 0x10000 + u16(at + 2))
  const ifd = u32(4)
  if (ifd + 2 > tiff.length) return null
  for (let n = u16(ifd), at = ifd + 2; n > 0 && at + 12 <= tiff.length; n--, at += 12) {
    if (u16(at) !== 0x0112) continue
    const value = u16(at + 8)
    return u16(at + 2) === 3 && value >= 2 && value <= 8 ? value : null
  }
  return null
}

/** An APP1 whose EXIF says only the orientation (big-endian, one entry). */
const orientationSegment = (o: number) =>
  new Uint8Array([
    ...[0xff, 0xe1, 0x00, 0x22],
    // "Exif", two zero bytes
    ...[0x45, 0x78, 0x69, 0x66, 0x00, 0x00],
    // "MM", 42, the directory at 8
    ...[0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08],
    // one entry: 0x0112 Orientation, a SHORT, 1 of it
    ...[0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, o, 0x00, 0x00],
    // no next directory
    ...[0x00, 0x00, 0x00, 0x00],
  ])

/** A PNG's chunks to `IEND`, without its EXIF, texts and time. */
function cleanPng(b: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const out: Uint8Array[] = [b.subarray(0, 8)]
  for (let i = 8; i + 12 <= b.length;) {
    const end = i + 12 + (((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0)
    if (end > b.length) return null
    const type = String.fromCharCode(...b.subarray(i + 4, i + 8))
    if (!['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME'].includes(type)) out.push(b.subarray(i, end))
    if (type === 'IEND') return concat(out)
    i = end
  }
  return null
}

/** A WebP's chunks without its EXIF and XMP, the extended header told they're gone. */
function cleanWebp(b: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const u32 = (at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16)) + b[at + 3]! * 0x1000000
  const riffEnd = 8 + u32(4)
  if (riffEnd > b.length) return null
  const out: Uint8Array[] = []
  for (let i = 12; i < riffEnd;) {
    if (i + 8 > riffEnd) return null
    const size = u32(i + 4)
    if (i + 8 + size > riffEnd) return null
    // a chunk of odd size has a byte of padding (one at the very end is sometimes left out)
    const end = Math.min(i + 8 + size + (size % 2), riffEnd)
    if (spells(b, i, 'VP8X') && size > 0) {
      const chunk = b.slice(i, end)
      // its EXIF (0x08) and XMP (0x04) flags
      chunk[8] = chunk[8]! & ~0x0c
      out.push(chunk)
    } else if (!spells(b, i, 'EXIF') && !spells(b, i, 'XMP ')) out.push(b.subarray(i, end))
    i = end
  }
  const size = out.reduce((n, p) => n + p.length, 4)
  const head = new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46,
    size & 0xff,
    (size >> 8) & 0xff,
    (size >> 16) & 0xff,
    size >>> 24,
    0x57,
    0x45,
    0x42,
    0x50,
  ])
  return concat([head, ...out])
}
