/** "Profilim": the person's photo, the same in every workspace (book B-12, F-084); the old one goes from the store. */
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { dropPhoto, savePhoto } from '../media/photos'

export async function setMyPhoto(deps: Deps, user: User, file: File): Promise<User> {
  const key = await savePhoto(deps, `u/${user.id}`, file)
  const [row] = await deps.db
    .update(users)
    .set({ photo: { key, alt: {} } })
    .where(eq(users.id, user.id))
    .returning()
  await dropPhoto(deps, user.photo?.key)
  return row ?? user
}

export async function removeMyPhoto(deps: Deps, user: User): Promise<User> {
  const [row] = await deps.db.update(users).set({ photo: null }).where(eq(users.id, user.id)).returning()
  await dropPhoto(deps, user.photo?.key)
  return row ?? user
}
