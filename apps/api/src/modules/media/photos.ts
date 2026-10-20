/**
 * Keeping the photos people send (book F-101): checked by their bytes (JPEG, PNG or WebP; the size by the contract),
 * kept in the media store under a key nobody can guess, and removed once nothing points at them. The demo's photos
 * aren't the store's to remove.
 */
import { photoKind } from '@yeral/domain/photos'
import type { Deps } from '../../deps'
import { invalid } from '../../http/errors'
import { randomToken } from '../../lib/crypto'

/** A photo's id in a list: the end of its key (`up/b/<id>/<token>.jpg` → `<token>`, `demo/hair.jpg` → `hair`). */
export const photoIdOf = (key: string) => key.slice(key.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '')

/** The photo kept under `up/<folder>/`; its key. Anything that isn't a photo is `wrong_type`. */
export async function savePhoto(deps: Pick<Deps, 'storage'>, folder: string, file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const kind = photoKind(data)
  if (!kind) throw invalid({ path: ['file'], code: 'wrong_type' })
  const key = `up/${folder}/${randomToken(16)}.${kind}`
  await deps.storage.put(key, data)
  return key
}

/** The photo goes from the store once nothing points at it. */
export async function dropPhoto(deps: Pick<Deps, 'storage'>, key: string | null | undefined): Promise<void> {
  if (key?.startsWith('up/')) await deps.storage.remove(key)
}
