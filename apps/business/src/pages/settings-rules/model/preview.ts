import type { BusinessHours } from '@yeral/domain/hours'
import { holdUntil } from '@yeral/domain/lifecycle'
import { addDays, epochOf, localOf } from '@yeral/domain/time'

/** «What the client sees» (B-Settings `.pv`): an example request sent today at 14:40 for tomorrow at 14:30. */
export const EXAMPLE_SENT = 14 * 60 + 40
export const EXAMPLE_VISIT = 14 * 60 + 30

/**
 * When the business answers the example request by: the hold counted only while it's open, never past the visit's
 * start (book Q-120, `holdUntil`), so it's today or tomorrow, never later.
 */
export function exampleAnswerBy(today: string, holdMinutes: number, business: BusinessHours): { min: number; tomorrow: boolean } {
  const visit = { date: addDays(today, 1), start: EXAMPLE_VISIT }
  const at = localOf(holdUntil(epochOf(today, EXAMPLE_SENT), visit, holdMinutes, business))
  return { min: at.min, tomorrow: at.date !== today }
}
