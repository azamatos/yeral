/**
 * "Profilim": the person's photo, the same in every workspace (book B-12, F-084); the old one goes from the store. Their
 * teams see it where the owner set no picture.
 */
import { and, eq, isNull } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { staff, users } from '../../db/schema'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { ApiError } from '../../http/errors'
import { dropPhoto, replacePhoto } from '../media/photos'
import { teamChanged } from '../team/service'

/** The account's row as it is now, held: of two photos sent at once the later replaces the earlier, and nothing's lost. */
async function lockedPhoto(tx: Queryable, user: User) {
  const [row] = await tx.select({ photo: users.photo }).from(users).where(eq(users.id, user.id)).for('no key update')
  if (!row) throw new ApiError('unauthorized')
  return row.photo
}

/** The teams whose screens show the account's photo: those where the owner set no picture. */
async function teamsSee(tx: Queryable, user: User) {
  const rows = await tx
    .select({ businessId: staff.businessId })
    .from(staff)
    .where(and(eq(staff.userId, user.id), eq(staff.status, 'active'), isNull(staff.photo)))
  for (const businessId of new Set(rows.map((r) => r.businessId))) await teamChanged(tx, businessId)
}

export async function setMyPhoto(deps: Deps, user: User, file: File): Promise<User> {
  return replacePhoto(deps, `u/${user.id}`, file, (key) =>
    deps.db.transaction(async (tx) => {
      const before = await lockedPhoto(tx, user)
      const [row] = await tx
        .update(users)
        .set({ photo: { key, alt: {} } })
        .where(eq(users.id, user.id))
        .returning()
      await teamsSee(tx, user)
      return { result: row!, replaced: before?.key }
    }),
  )
}

export async function removeMyPhoto(deps: Deps, user: User): Promise<User> {
  const { row, before } = await deps.db.transaction(async (tx) => {
    const before = await lockedPhoto(tx, user)
    const [row] = await tx.update(users).set({ photo: null }).where(eq(users.id, user.id)).returning()
    if (before) await teamsSee(tx, user)
    return { row: row!, before }
  })
  await dropPhoto(deps, before?.key)
  return row
}
