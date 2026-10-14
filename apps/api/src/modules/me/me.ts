import type { Me } from '@yeral/contract/account'
import { and, eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { memberships } from '../../db/schema'
import type { User } from '../../http/env'

export async function toMe(db: Queryable, user: User): Promise<Me> {
  const [member] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, 'active')))
    .limit(1)
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    lang: user.lang,
    notifications: {
      confirmation: user.notifyConfirmation,
      reminderDay: user.notifyReminderDay,
      reminder2h: user.notifyReminder2h,
      reviewAsk: user.notifyReviewAsk,
    },
    hasBusiness: !!member,
  }
}
