/**
 * The business's gallery (book B-37, Q-115, F-101): up to 20 photos, the first the cover on every card and page. The
 * owner and administrators add, remove and order them ("change business settings"); the page follows at once.
 */
import type { gallerySchema } from '@yeral/contract/settings'
import { MARKET } from '@yeral/domain/market'
import type { Locale } from '@yeral/domain/model'
import { GALLERY_MAX } from '@yeral/domain/photos'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { businesses } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { emit } from '../../notify'
import { photoOf } from '../catalog/map'
import { dropPhoto, photoIdOf, savePhoto } from '../media/photos'

type Gallery = z.infer<typeof gallerySchema>
interface Business {
  id: string
}

async function lockedBusiness(db: Queryable, id: string) {
  const [b] = await db.select().from(businesses).where(eq(businesses.id, id)).for('no key update')
  if (!b) throw new ApiError('not_found')
  return b
}

const viewOf = (deps: Pick<Deps, 'media'>, photos: (typeof businesses.$inferSelect)['photos'], lang: Locale): Gallery => ({
  items: photos.map((p) => ({ id: photoIdOf(p.key), ...photoOf(deps, p, lang) })),
})

export async function galleryOf(deps: Deps, business: Business, lang: Locale): Promise<Gallery> {
  const [b] = await deps.db.select({ photos: businesses.photos }).from(businesses).where(eq(businesses.id, business.id))
  if (!b) throw new ApiError('not_found')
  return viewOf(deps, b.photos, lang)
}

/** A photo at the end of the gallery, its alt text the business's name; `gallery_full` past 20. */
export async function addPhoto(deps: Deps, business: Business, file: File, lang: Locale): Promise<Gallery> {
  const key = await savePhoto(deps, `b/${business.id}`, file)
  try {
    return await deps.db.transaction(async (tx) => {
      const b = await lockedBusiness(tx, business.id)
      if (b.photos.length >= GALLERY_MAX) throw new ApiError('gallery_full')
      const photos = [...b.photos, { key, alt: { [MARKET.defaultLanguage]: b.name } }]
      await tx.update(businesses).set({ photos }).where(eq(businesses.id, b.id))
      await emit(tx, { type: 'business.updated', businessId: b.id })
      return viewOf(deps, photos, lang)
    })
  } catch (e) {
    // not kept: it goes from the store too
    await dropPhoto(deps, key)
    throw e
  }
}

/** The photo goes from the gallery, and from the store once it's gone from the page. */
export async function removePhoto(deps: Deps, business: Business, id: string, lang: Locale): Promise<Gallery> {
  const { gallery, key } = await deps.db.transaction(async (tx) => {
    const b = await lockedBusiness(tx, business.id)
    const gone = b.photos.find((p) => photoIdOf(p.key) === id)
    if (!gone) throw new ApiError('not_found')
    const photos = b.photos.filter((p) => p !== gone)
    await tx.update(businesses).set({ photos }).where(eq(businesses.id, b.id))
    await emit(tx, { type: 'business.updated', businessId: b.id })
    return { gallery: viewOf(deps, photos, lang), key: gone.key }
  })
  await dropPhoto(deps, key)
  return gallery
}

/** The gallery in a new order (the first is the cover): every photo it has, once. */
export async function orderPhotos(deps: Deps, business: Business, ids: string[], lang: Locale): Promise<Gallery> {
  return deps.db.transaction(async (tx) => {
    const b = await lockedBusiness(tx, business.id)
    const byId = new Map(b.photos.map((p) => [photoIdOf(p.key), p]))
    if (ids.length !== b.photos.length || new Set(ids).size !== ids.length || !ids.every((id) => byId.has(id)))
      throw invalid({ path: ['ids'], code: 'not_the_gallery' })
    const photos = ids.map((id) => byId.get(id)!)
    await tx.update(businesses).set({ photos }).where(eq(businesses.id, b.id))
    await emit(tx, { type: 'business.updated', businessId: b.id })
    return viewOf(deps, photos, lang)
  })
}
