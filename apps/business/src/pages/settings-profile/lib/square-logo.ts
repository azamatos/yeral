/**
 * The logo as the api keeps it (contract `businessLogoSchema`: «the app crops it»): square, the largest square in the
 * middle of the picture picked, shrunk to `LOGO_MAX_PX`, at least `LOGO_MIN_PX` (book B-37); a JPG, PNG or WebP by its
 * bytes, within the api's `PHOTO_MAX_BYTES`, before and after the crop.
 */
import { PHOTO_KINDS, PHOTO_MAX_BYTES, photoKind } from '@yeral/domain/photos'

export const LOGO_TYPES: readonly string[] = Object.values(PHOTO_KINDS)
export const LOGO_MIN_PX = 400
/** Logos show at 64 at most (the switcher, search cards): 1024 keeps them sharp on any screen. */
export const LOGO_MAX_PX = 1024

export type LogoCheck =
  | { ok: true; file: File }
  | { ok: false; problem: 'wrongType' }
  | { ok: false; problem: 'tooBig'; mb: number }
  | { ok: false; problem: 'tooSmall'; width: number; height: number }

const tooBig = (bytes: number): LogoCheck => ({ ok: false, problem: 'tooBig', mb: Math.ceil(bytes / 1_000_000) })

/**
 * Checks the picked file and crops it to the largest square in its middle, shrunk to 1024 (a square one within 1024
 * goes as it is). Anything the browser can't read or draw is `wrongType`, never an empty logo.
 */
export async function squareLogo(file: File): Promise<LogoCheck> {
  if (file.size > PHOTO_MAX_BYTES) return tooBig(file.size)
  const kind = photoKind(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!kind) return { ok: false, problem: 'wrongType' }
  const image = await createImageBitmap(file).catch(() => null)
  if (!image) return { ok: false, problem: 'wrongType' }
  try {
    const { width, height } = image
    const side = Math.min(width, height)
    if (side < LOGO_MIN_PX) return { ok: false, problem: 'tooSmall', width, height }
    if (width === height && side <= LOGO_MAX_PX) return { ok: true, file }
    const out = Math.min(side, LOGO_MAX_PX)
    const canvas = new OffscreenCanvas(out, out)
    const context = canvas.getContext('2d')
    if (!context) return { ok: false, problem: 'wrongType' }
    context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, out, out)
    // the browser may not write that kind (Safari and WebP): the file is what it wrote, named for it
    const blob = await canvas.convertToBlob({ type: PHOTO_KINDS[kind], quality: 0.92 })
    if (blob.size > PHOTO_MAX_BYTES) return tooBig(blob.size)
    const written = (Object.keys(PHOTO_KINDS) as (keyof typeof PHOTO_KINDS)[]).find((k) => PHOTO_KINDS[k] === blob.type) ?? 'png'
    return { ok: true, file: new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${written}`, { type: blob.type }) }
  } catch {
    return { ok: false, problem: 'wrongType' }
  } finally {
    image.close()
  }
}
