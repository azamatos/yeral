/**
 * A team member's picture, the one clients see beside their name (book B-44, F-101); the old one goes from the store.
 * Without one the team's own screens show the person's account photo (B-12).
 */
import { eq } from 'drizzle-orm'
import { staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { dropPhoto, replacePhoto } from '../media/photos'
import { teamChanged, teamRow, type StaffRow } from './service'

export async function setStaffPhoto(deps: Deps, businessId: string, staffId: string, file: File): Promise<StaffRow> {
  // someone not on this team is refused before anything is kept
  await teamRow(deps.db, businessId, staffId)
  return replacePhoto(deps, `s/${staffId}`, file, (key) =>
    deps.db.transaction(async (tx) => {
      // held: of two pictures sent at once the later replaces the earlier, and nothing's lost
      const before = await teamRow(tx, businessId, staffId, { lock: true })
      const [next] = await tx
        .update(staff)
        .set({ photo: { key, alt: {} } })
        .where(eq(staff.id, staffId))
        .returning()
      await teamChanged(tx, businessId, { userId: before.userId })
      return { result: next!, replaced: before.photo?.key }
    }),
  )
}

export async function removeStaffPhoto(deps: Deps, businessId: string, staffId: string): Promise<StaffRow> {
  const { row, before } = await deps.db.transaction(async (tx) => {
    const before = await teamRow(tx, businessId, staffId, { lock: true })
    const [row] = await tx.update(staff).set({ photo: null }).where(eq(staff.id, staffId)).returning()
    await teamChanged(tx, businessId, { userId: before.userId })
    return { row: row!, before }
  })
  await dropPhoto(deps, before.photo?.key)
  return row
}
