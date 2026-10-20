import type { Me } from '@yeral/contract/account'
import type { Queryable } from '../../db/client'
import type { User } from '../../http/env'
import { workspaceIdsOf } from '../team/members'

export async function toMe(db: Queryable, user: User): Promise<Me> {
  const workspaces = await workspaceIdsOf(db, user.id)
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    lang: user.lang,
    notifications: {
      confirmation: user.notifyConfirmation,
      reminderDay: user.notifyReminderDay,
      reminder2h: user.notifyReminder2h,
    },
    hasBusiness: workspaces.length > 0,
  }
}
