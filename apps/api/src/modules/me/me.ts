import type { Me } from '@yeral/contract/account'
import { fullName, type PersonName } from '@yeral/domain/names'
import type { Queryable } from '../../db/client'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { workspaceIdsOf } from '../team/members'

/** The account's name, in its two fields (book Q-156). */
export const nameOf = (user: User): PersonName => ({ first: user.name, surname: user.surname })

/** The whole name businesses see on the client record and the booking ("Aýjemal Gurbanowa"). */
export const accountName = (user: User): string | null => fullName(nameOf(user))

/**
 * A phone change works here: not while the sign-in code shows on the screen (a number proves nothing then, book
 * Q-036). The routes refuse by it and `me` says it.
 */
export const phoneChangeOpen = (deps: Pick<Deps, 'codeOnScreen'>) => !deps.codeOnScreen

/** The signed-in person, as the deployment `deps` runs. */
export async function toMe(db: Queryable, user: User, deps: Pick<Deps, 'codeOnScreen'>): Promise<Me> {
  const workspaces = await workspaceIdsOf(db, user.id)
  return {
    id: user.id,
    name: accountName(user),
    firstName: user.name,
    surname: user.surname,
    phone: user.phone,
    lang: user.lang,
    notifications: {
      confirmation: user.notifyConfirmation,
      reminderDay: user.notifyReminderDay,
      reminder2h: user.notifyReminder2h,
      reviewAsk: false,
    },
    hasBusiness: workspaces.length > 0,
    canChangePhone: phoneChangeOpen(deps),
  }
}
