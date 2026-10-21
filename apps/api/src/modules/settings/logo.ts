/**
 * The business's logo (book B-37, F-100): square, the switcher's, the invite card's and the profile's picture. The owner
 * and administrators set and remove it ("change business settings"); the old one goes from the store.
 */
import type { businessLogoSchema } from '@yeral/contract/settings'
import type { Locale } from '@yeral/domain/model'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import { businesses } from '../../db/schema'
import type { Deps } from '../../deps'
import { emit } from '../../notify'
import { logoOf } from '../catalog/map'
import { dropPhoto, replacePhoto } from '../media/photos'
import { lockedBusiness } from './photos'

type Logo = z.infer<typeof businessLogoSchema>

export async function setLogo(deps: Deps, business: { id: string }, file: File, lang: Locale): Promise<Logo> {
  return replacePhoto(deps, `b/${business.id}`, file, (key) =>
    deps.db.transaction(async (tx) => {
      const before = await lockedBusiness(tx, business.id)
      const logo = { key, alt: {} }
      await tx.update(businesses).set({ logo }).where(eq(businesses.id, business.id))
      // the switcher and the invite cards show it
      await emit(tx, { type: 'business.updated', businessId: business.id })
      return { result: { logo: logoOf(deps, { logo, name: before.name }, lang) }, replaced: before.logo?.key }
    }),
  )
}

export async function removeLogo(deps: Deps, business: { id: string }): Promise<Logo> {
  const before = await deps.db.transaction(async (tx) => {
    const before = await lockedBusiness(tx, business.id)
    if (!before.logo) return before
    await tx.update(businesses).set({ logo: null }).where(eq(businesses.id, business.id))
    await emit(tx, { type: 'business.updated', businessId: business.id })
    return before
  })
  await dropPhoto(deps, before.logo?.key)
  return { logo: null }
}
