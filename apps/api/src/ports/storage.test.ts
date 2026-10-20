import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { diskStorage, typeOfKey } from './storage'

describe('the media store (book F-101)', () => {
  const dirs: string[] = []
  afterAll(async () => {
    for (const d of dirs) await rm(d, { recursive: true, force: true })
  })

  it('keeps, reads and removes a file by its key; nothing outside its folder can be named', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'yeral-media-'))
    dirs.push(dir)
    const store = diskStorage(dir)
    const data = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])
    await store.put('up/b/abc123/x_Y-9.jpg', data)
    expect(await store.get('up/b/abc123/x_Y-9.jpg')).toEqual({ data, type: 'image/jpeg' })
    expect(await store.get('up/b/abc123/missing.jpg')).toBeNull()
    await store.remove('up/b/abc123/x_Y-9.jpg')
    expect(await store.get('up/b/abc123/x_Y-9.jpg')).toBeNull()
    for (const bad of ['../etc/passwd', 'up/../../x.jpg', 'up/b/x.svg', 'demo/hair.jpg', 'up/b/.jpg'])
      expect(typeOfKey(bad), bad).toBeNull()
    await expect(store.put('up/../x.jpg', data)).rejects.toThrow()
    expect(await store.get('up/../x.jpg')).toBeNull()
  })
})
