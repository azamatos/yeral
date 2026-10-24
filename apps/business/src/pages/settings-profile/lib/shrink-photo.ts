/**
 * A gallery photo before it's sent (sdk `addPhoto`: «the app makes it smaller first»): a JPG, PNG or WebP by its bytes,
 * within the api's `PHOTO_MAX_BYTES`, and no longer than `PHOTO_MAX_PX` on its long side (the business page shows them
 * at about 1200 at most).
 */
import { PHOTO_KINDS, PHOTO_MAX_BYTES, photoKind, type PhotoKind } from '@yeral/domain/photos'

export const PHOTO_MAX_PX = 2048

export type PhotoCheck = { ok: true; file: File } | { ok: false; problem: 'wrongType' } | { ok: false; problem: 'tooBig'; mb: number }

const mbOf = (bytes: number) => Math.ceil(bytes / 1_000_000)

/** Checks the picked file and shrinks it to 2048 on its long side when it's longer; anything unreadable is `wrongType`. */
export async function shrinkPhoto(file: File): Promise<PhotoCheck> {
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, problem: 'tooBig', mb: mbOf(file.size) }
  const kind = photoKind(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!kind) return { ok: false, problem: 'wrongType' }
  const image = await createImageBitmap(file).catch(() => null)
  if (!image) return { ok: false, problem: 'wrongType' }
  try {
    const long = Math.max(image.width, image.height)
    if (long <= PHOTO_MAX_PX) return { ok: true, file }
    const scale = PHOTO_MAX_PX / long
    const canvas = new OffscreenCanvas(Math.round(image.width * scale), Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return { ok: true, file }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await canvas.convertToBlob({ type: PHOTO_KINDS[kind], quality: 0.88 })
    // the browser may not write that kind (Safari and WebP): the file is what it wrote, named for it
    const written = (Object.keys(PHOTO_KINDS) as PhotoKind[]).find((k) => PHOTO_KINDS[k] === blob.type) ?? 'png'
    const smaller = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${written}`, { type: blob.type })
    return smaller.size <= PHOTO_MAX_BYTES ? { ok: true, file: smaller } : { ok: true, file }
  } catch {
    // can't shrink it here: the original goes, within the limit already
    return { ok: true, file }
  } finally {
    image.close()
  }
}
