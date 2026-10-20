import { describe, expect, it } from 'vitest'
import { cleanPhoto, photoKind } from './photos'

describe('a photo’s kind from its first bytes (book F-101)', () => {
  it('JPEG, PNG and WebP; anything else isn’t a photo', () => {
    expect(photoKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpg')
    expect(photoKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png')
    expect(photoKind(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe('webp')
    expect(photoKind(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(photoKind(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(photoKind(new Uint8Array([]))).toBeNull()
  })
})

const text = (s: string) => [...s].map((c) => c.charCodeAt(0))
const clean = (bytes: number[]) => {
  const c = cleanPhoto(new Uint8Array(bytes))
  return c && { kind: c.kind, bytes: [...c.bytes] }
}

describe('a photo without what it says about where it was taken (book F-101)', () => {
  // a JPEG's segment: its marker, its length, its body
  const seg = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body]
  // a phone's EXIF, little-endian: the orientation and a pointer to the GPS, then the GPS itself
  const exif = (orientation: number) => [
    ...text('Exif'),
    0,
    0,
    ...[0x49, 0x49, 0x2a, 0, 8, 0, 0, 0],
    ...[2, 0],
    ...[0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0],
    ...[0x25, 0x88, 4, 0, 1, 0, 0, 0, 0x26, 0, 0, 0],
    ...[0, 0, 0, 0],
    ...text('GPS 37.95N 58.38E'),
  ]
  const jfif = seg(0xe0, [...text('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
  const icc = seg(0xe2, [...text('ICC_PROFILE'), 0, 1, 1, 9, 9])
  const xmp = seg(0xe1, [...text('http://ns.adobe.com/xap/1.0/'), 0, ...text('<x:xmpmeta/>')])
  const iptc = seg(0xed, text('Photoshop 3.0'))
  const comment = seg(0xfe, text('taken at home'))
  const tables = seg(0xdb, [0, 1, 2, 3])
  // a scan: its header, then data with a stuffed 0xFF and a restart marker
  const scan = [...seg(0xda, [1, 2, 3]), 0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56]
  const jpeg = (orientation: number, ...after: number[]) => [
    ...[0xff, 0xd8],
    ...jfif,
    ...seg(0xe1, exif(orientation)),
    ...xmp,
    ...icc,
    ...iptc,
    ...comment,
    ...tables,
    ...scan,
    // a progressive JPEG's next tables and scan
    ...seg(0xc4, [7, 7]),
    ...scan,
    ...[0xff, 0xd9],
    ...after,
  ]
  const orientedOnly = [
    ...[0xff, 0xe1, 0, 0x22],
    ...text('Exif'),
    ...[0, 0],
    ...[0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8],
    ...[0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0],
    ...[0, 0, 0, 0],
  ]

  it('a JPEG keeps its image, colour profile and orientation; its EXIF, XMP, IPTC, comments and what follows go', () => {
    // a picture a phone adds after the photo, with an EXIF of its own
    const added = [0xff, 0xd8, ...seg(0xe1, exif(1)), 0xff, 0xd9]
    expect(clean(jpeg(6, ...added))).toEqual({
      kind: 'jpg',
      bytes: [0xff, 0xd8, ...jfif, ...orientedOnly, ...icc, ...tables, ...scan, ...seg(0xc4, [7, 7]), ...scan, 0xff, 0xd9],
    })
    // upright: no EXIF at all
    expect(clean(jpeg(1))!.bytes).toEqual([0xff, 0xd8, ...jfif, ...icc, ...tables, ...scan, ...seg(0xc4, [7, 7]), ...scan, 0xff, 0xd9])
  })

  it('a PNG loses its EXIF, texts and time, and anything after its end', () => {
    const chunk = (type: string, data: number[]) => [0, 0, 0, data.length, ...text(type), ...data, 1, 2, 3, 4]
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const head = chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])
    const png = [
      ...signature,
      ...head,
      ...chunk('eXIf', text('MM GPS')),
      ...chunk('tEXt', text('Location')),
      ...chunk('tIME', [7, 234, 10, 21, 9, 0, 0]),
      ...chunk('IDAT', [1, 2, 3]),
      ...chunk('IEND', []),
      ...text('more'),
    ]
    expect(clean(png)).toEqual({ kind: 'png', bytes: [...signature, ...head, ...chunk('IDAT', [1, 2, 3]), ...chunk('IEND', [])] })
  })

  it('a WebP loses its EXIF and XMP, and its header no longer claims them', () => {
    const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24]
    const chunk = (type: string, data: number[]) => [...text(type), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])]
    const riff = (chunks: number[]) => [...text('RIFF'), ...le32(chunks.length + 4), ...text('WEBP'), ...chunks]
    // VP8X: an ICC profile (0x20), EXIF (0x08) and XMP (0x04)
    const header = (flags: number) => chunk('VP8X', [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const rest = [...chunk('ICCP', [5, 5]), ...chunk('VP8 ', [1, 2, 3])]
    const webp = riff([...header(0x2c), ...rest, ...chunk('EXIF', text('GPS')), ...chunk('XMP ', text('<x/>'))])
    expect(clean(webp)).toEqual({ kind: 'webp', bytes: riff([...header(0x20), ...rest]) })
  })

  it('anything cut short or not a photo is none', () => {
    const whole = jpeg(6)
    expect(clean(whole.slice(0, 40))).toBeNull()
    expect(clean(whole.slice(0, -2))).toBeNull()
    expect(clean([0xff, 0xd8, 0xff, 0xe0, 1])).toBeNull()
    expect(clean([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 9])).toBeNull()
    expect(clean(text('GIF89a'))).toBeNull()
  })
})
