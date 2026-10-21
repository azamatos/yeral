/**
 * The photos people upload go through this port (book F-101): kept by key on the server's disk, beside the database
 * (ADR 0024); object storage would be another adapter here. A key is `up/<folder>/<token>.<jpg|png|webp>`: what it
 * holds comes from its extension, and nothing outside the media folder can be named.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { PHOTO_KINDS, type PhotoKind } from '@yeral/domain/photos'

export interface StoredFile {
  data: Uint8Array<ArrayBuffer>
  type: string
}

export interface StoragePort {
  put(key: string, data: Uint8Array<ArrayBuffer>): Promise<void>
  /** null for a key that holds nothing, or isn't one. */
  get(key: string): Promise<StoredFile | null>
  remove(key: string): Promise<void>
}

const KEY = /^up\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.(jpg|png|webp)$/

/** What a key holds, or null when it isn't a key the store gives out. */
export function typeOfKey(key: string): string | null {
  const m = KEY.exec(key)
  return m ? PHOTO_KINDS[m[2] as PhotoKind] : null
}

/** Files under `dir`, one per key. */
export function diskStorage(dir: string): StoragePort {
  const pathOf = (key: string) => {
    if (!typeOfKey(key)) throw new Error(`not a media key: ${key}`)
    return join(dir, key)
  }
  return {
    async put(key, data) {
      const path = pathOf(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, data)
    },
    async get(key) {
      const type = typeOfKey(key)
      if (!type) return null
      try {
        return { data: new Uint8Array(await readFile(join(dir, key))), type }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
      }
    },
    async remove(key) {
      await rm(pathOf(key), { force: true })
    },
  }
}

/** Kept in memory for the tests (`files`). */
export function memoryStorage(): StoragePort & { files: Map<string, Uint8Array<ArrayBuffer>> } {
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  return {
    files,
    put(key, data) {
      if (!typeOfKey(key)) throw new Error(`not a media key: ${key}`)
      files.set(key, data)
      return Promise.resolve()
    },
    get(key) {
      const type = typeOfKey(key)
      const data = files.get(key)
      return Promise.resolve(type && data ? { data, type } : null)
    },
    remove(key) {
      files.delete(key)
      return Promise.resolve()
    },
  }
}
