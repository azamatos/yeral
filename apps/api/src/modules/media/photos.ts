/**
 * Keeping the photos people send (book F-101): checked by their bytes (JPEG, PNG or WebP; the size by the contract),
 * kept without their metadata in the media store under a key nobody can guess, and removed once nothing points at
 * them. The demo's photos aren't the store's to remove.
 */
import { cleanPhoto } from '@yeral/domain/photos'
import type { MiddlewareHandler } from 'hono'
import type { Deps } from '../../deps'
import type { AppEnv } from '../../http/env'
import { invalid } from '../../http/errors'
import { randomToken } from '../../lib/crypto'
import { clientIp, hit, rateLimited } from '../../lib/rate-limit'
import { requireUser } from '../auth/session'

/** Uploads an hour: a gallery and a team's pictures, retries and all, fit; filling the server's disk doesn't. */
export const UPLOADS_PER_ACCOUNT = 60
export const UPLOADS_PER_ADDRESS = 120

/**
 * In front of every upload, before its body is read: a caller who isn't signed in, or has sent the hour's uploads, has
 * nothing parsed.
 */
export const uploadGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = requireUser(c)
  const { db, now, trustedIpHeader } = c.var.deps
  for (const [key, limit] of [
    [`upload:user:${user.id}`, UPLOADS_PER_ACCOUNT],
    [`upload:ip:${clientIp((n) => c.req.header(n), trustedIpHeader)}`, UPLOADS_PER_ADDRESS],
  ] as const) {
    const r = await hit(db, key, limit, 3600, now())
    if (!r.ok) throw rateLimited(r.retryAfterSec)
  }
  await next()
}

/** A photo's id in a list: the end of its key (`up/b/<id>/<token>.jpg` → `<token>`, `demo/hair.jpg` → `hair`). */
export const photoIdOf = (key: string) => key.slice(key.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '')

/** The photo kept under `up/<folder>/`, its EXIF and the like gone; its key. Anything that isn't a photo is `wrong_type`. */
export async function savePhoto(deps: Pick<Deps, 'storage'>, folder: string, file: File): Promise<string> {
  const photo = cleanPhoto(new Uint8Array(await file.arrayBuffer()))
  if (!photo) throw invalid({ path: ['file'], code: 'wrong_type' })
  const key = `up/${folder}/${randomToken(16)}.${photo.kind}`
  await deps.storage.put(key, photo.bytes)
  return key
}

/** The photos go from the store once nothing points at them. */
export async function dropPhotos(deps: Pick<Deps, 'storage'>, keys: (string | null | undefined)[]): Promise<void> {
  for (const key of keys) if (key?.startsWith('up/')) await deps.storage.remove(key)
}

export const dropPhoto = (deps: Pick<Deps, 'storage'>, key: string | null | undefined) => dropPhotos(deps, [key])

/**
 * Saves the photo, then runs `write` with its key; `write` returns the key it replaced, which goes from the store once
 * the write is done. A write that fails leaves nothing behind: the new photo goes too.
 */
export async function replacePhoto<T>(
  deps: Pick<Deps, 'storage'>,
  folder: string,
  file: File,
  write: (key: string) => Promise<{ result: T; replaced: string | null | undefined }>,
): Promise<T> {
  const key = await savePhoto(deps, folder, file)
  let done: { result: T; replaced: string | null | undefined }
  try {
    done = await write(key)
  } catch (e) {
    await dropPhoto(deps, key)
    throw e
  }
  await dropPhoto(deps, done.replaced)
  return done.result
}
