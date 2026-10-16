/** Class sessions with the seats already taken by active bookings. */
import type { Localized } from '@yeral/domain/model'
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, classSessions, staff } from '../../db/schema'

export interface SessionView {
  id: string
  businessId: string
  name: Localized
  level: Localized | null
  date: string
  start: number
  durationMin: number
  capacity: number
  price: number
  booked: number
  trainer: { id: string; name: string } | null
}

export async function loadSessions(db: Queryable, businessIds: string[], from: string, to: string): Promise<SessionView[]> {
  if (!businessIds.length) return []
  const rows = await db
    .select({ s: classSessions, trainerName: staff.name })
    .from(classSessions)
    .leftJoin(staff, eq(staff.id, classSessions.trainerId))
    .where(and(inArray(classSessions.businessId, businessIds), gte(classSessions.date, from), lte(classSessions.date, to)))
    .orderBy(asc(classSessions.date), asc(classSessions.start))
  if (!rows.length) return []
  const taken = await db
    .select({ sessionId: bookings.sessionId, seats: sql<number>`coalesce(sum(${bookings.seats}), 0)::int` })
    .from(bookings)
    .where(
      and(
        inArray(
          bookings.sessionId,
          rows.map((r) => r.s.id),
        ),
        eq(bookings.active, true),
      ),
    )
    .groupBy(bookings.sessionId)
  return rows.map(({ s, trainerName }) => ({
    id: s.id,
    businessId: s.businessId,
    name: s.name,
    level: s.level,
    date: s.date,
    start: s.start,
    durationMin: s.durationMin,
    capacity: s.capacity,
    price: s.price,
    booked: taken.find((x) => x.sessionId === s.id)?.seats ?? 0,
    trainer: s.trainerId && trainerName ? { id: s.trainerId, name: trainerName } : null,
  }))
}
