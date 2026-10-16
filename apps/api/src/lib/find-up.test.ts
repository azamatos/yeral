import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findUp } from './find-up'

const PHOTOS = fileURLToPath(new URL('../../../../docs/design/assets/photos', import.meta.url))

describe('findUp', () => {
  it('finds the demo photos from the Node entry in src/ and from the bundle in dist/', () => {
    expect(existsSync(PHOTOS)).toBe(true)
    expect(findUp(new URL('../entry/node.ts', import.meta.url), 'docs/design/assets/photos')).toBe(PHOTOS)
    expect(findUp(new URL('../../dist/node.js', import.meta.url), 'docs/design/assets/photos')).toBe(PHOTOS)
  })

  it('is undefined when no parent has the path (the Docker image without DEMO_MEDIA_DIR)', () => {
    expect(findUp(new URL('file:///app/dist/node.js'), 'docs/design/assets/photos')).toBeUndefined()
  })
})
