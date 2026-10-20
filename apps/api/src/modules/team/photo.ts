/** A team member's picture, the one clients see beside their name (book B-44, F-101); the old one goes from the store. */
import { MARKET } from '@yeral/domain/market'
import { eq } from 'drizzle-orm'
import { staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { dropPhoto, savePhoto } from '../media/photos'
import { teamChanged, teamRow, type StaffRow } from './service'

export async function setStaffPhoto(deps: Deps, businessId: string, staffId: string, file: File): Promise<StaffRow> {
  const before = await teamRow(deps.db, businessId, staffId)
  const key = await savePhoto(deps, `s/${staffId}`, file)
  const row = await deps.db.transaction(async (tx) => {
    const [next] = await tx
      .update(staff)
      .set({ photo: { key, alt: { [MARKET.defaultLanguage]: before.name } } })
      .where(eq(staff.id, staffId))
      .returning()
    await teamChanged(tx, businessId, { userId: before.userId })
    return next!
  })
  await dropPhoto(deps, before.photo?.key)
  return row
}

export async function removeStaffPhoto(deps: Deps, businessId: string, staffId: string): Promise<StaffRow> {
  const before = await teamRow(deps.db, businessId, staffId)
  const row = await deps.db.transaction(async (tx) => {
    const [next] = await tx.update(staff).set({ photo: null }).where(eq(staff.id, staffId)).returning()
    await teamChanged(tx, businessId, { userId: before.userId })
    return next!
  })
  await dropPhoto(deps, before.photo?.key)
  return row
}
