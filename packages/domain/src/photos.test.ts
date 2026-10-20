import { describe, expect, it } from 'vitest'
import { photoKind } from './photos'

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
