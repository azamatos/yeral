import type { Me } from '@yeral/contract/account'
import { fullName, type PersonName } from '@yeral/domain/names'
import type { Queryable } from '../../db/client'
import type { User } from '../../http/env'
import { workspaceIdsOf } from '../team/members'

/** The account's name, in its two fields (book Q-156). */
export const nameOf = (user: User): PersonName => ({ first: user.name, surname: user.surname })

export async function toMe(db: Queryable, user: User): Promise<Me> {
  const workspaces = await workspaceIdsOf(db, user.id)
  return {
    id: user.id,
    name: fullName(nameOf(user)),
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
  }
}
