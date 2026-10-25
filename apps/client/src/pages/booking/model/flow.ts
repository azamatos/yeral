import { DAY_MINUTES } from '@yeral/domain/hours'
import { isYmd } from '@yeral/domain/time'
import { z } from 'zod'

export const STEPS = ['services', 'staff', 'time', 'confirm'] as const
export type Step = (typeof STEPS)[number]

/**
 * The booking flow's address (Booking, book C-12–C-14; client spec «keep `step, services, staff, date, time` in the
 * URL»): what's picked, so a reload, a shared link and Back keep the flow where it was. `time` is the start in minutes
 * of the business day `date` (past midnight up to 2879 on a day open late, book Q-105), as the api counts it. Anything
 * unreadable is dropped, not an error.
 */
export const bookingSearchSchema = z.object({
  services: z.string().optional().catch(undefined),
  /** A specialist's id, or `any` («Any specialist»). */
  staff: z.string().optional().catch(undefined),
  date: z
    .string()
    .refine((d) => isYmd(d))
    .optional()
    .catch(undefined),
  time: z.coerce
    .number()
    .int()
    .min(0)
    .max(2 * DAY_MINUTES - 1)
    .optional()
    .catch(undefined),
  step: z.enum(STEPS).optional().catch(undefined),
  /** The booking just sent (its code): the sent page, which a reload keeps. */
  sent: z.string().optional().catch(undefined),
  /** Move mode (book C-30): the confirmed appointment whose time changes (its code); no services step. */
  move: z.string().optional().catch(undefined),
  /**
   * The move just sent, its sent page (a reload keeps it): asked of a business that confirms by hand, or changed at
   * once; the new time is `date` and `time`, the previous one `was` (`YYYY-MM-DD@minute`).
   */
  moved: z.enum(['asked', 'changed']).optional().catch(undefined),
  was: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}@\d{1,4}$/)
    .optional()
    .catch(undefined),
})
export type BookingSearch = z.infer<typeof bookingSearchSchema>

/** Move mode's steps (Booking `mode=move`): the services stay as booked. */
export const MOVE_STEPS = ['staff', 'time', 'confirm'] as const
export type MoveStep = (typeof MOVE_STEPS)[number]

/** A time in the address's `was` (`2026-10-26@870`), or null. */
export function wasOf(was: string | undefined): { date: string; start: number } | null {
  const [date, start] = was?.split('@') ?? []
  return date && start && isYmd(date) ? { date, start: Number(start) } : null
}

/** The moved booking's own time with its own specialist (or anyone): no new time (another specialist then is one). */
export const isOwnTime = (
  move: { date: string; start: number; current: string | null },
  staff: string,
  date: string | null | undefined,
  start: number,
) => date === move.date && start === move.start && (staff === 'any' || staff === move.current)

/** The move's step the address asks for, held back to the time step until a new time is chosen. */
export function currentMoveStep(asked: Step | undefined, timed: boolean): MoveStep {
  const index = Math.min(Math.max(0, MOVE_STEPS.indexOf(asked as MoveStep)), timed ? 2 : 1)
  return MOVE_STEPS[index] ?? 'staff'
}

/** What's chosen so far: the services, and a start that counts only on its day. */
export interface Choice {
  services: readonly string[]
  date: string | null
  time: number | null
}

/** Whether the specialist does every picked service (Booking `can(pid)`). */
export const doesAll = (specialist: { serviceIds: readonly string[] }, serviceIds: readonly string[]) =>
  serviceIds.length > 0 && serviceIds.every((id) => specialist.serviceIds.includes(id))

/**
 * The chosen specialist while they still do every picked service; otherwise «any» (a new service may rule them out).
 * The address keeps them meanwhile ({@link namedSpecialist}): taking that service off brings them back.
 */
export function chosenStaff(
  detail: { specialists: readonly { id: string; serviceIds: readonly string[] }[] },
  serviceIds: readonly string[],
  staff: string | undefined,
): string {
  if (!staff || staff === 'any') return 'any'
  const specialist = detail.specialists.find((s) => s.id === staff)
  return specialist && doesAll(specialist, serviceIds) ? staff : 'any'
}

/** The specialist the address names (`?staff=`, «Book with …» on the business page) whatever's picked; null for «any». */
export function namedSpecialist<S extends { id: string }>(detail: { specialists: readonly S[] }, staff: string | undefined): S | null {
  if (!staff || staff === 'any') return null
  return detail.specialists.find((s) => s.id === staff) ?? null
}

/** The picked services the specialist doesn't do, in the order picked. */
export const notDoneBy = (specialist: { serviceIds: readonly string[] }, serviceIds: readonly string[]) =>
  serviceIds.filter((id) => !specialist.serviceIds.includes(id))

/** The groups with only the services the specialist does (a group left empty goes). */
export function servicesOf<G extends { services: readonly { id: string }[] }>(
  groups: readonly G[],
  specialist: { serviceIds: readonly string[] },
): G[] {
  return groups
    .map((g) => ({ ...g, services: g.services.filter((s) => specialist.serviceIds.includes(s.id)) }))
    .filter((g) => g.services.length > 0)
}

const timed = (choice: Choice) => choice.time !== null && choice.date !== null

/**
 * The furthest step the choice reaches: the services first; with one picked, the specialist (always answered: «any»
 * by default) and the time; with a time on its day, the confirmation.
 */
export function reachedStep(choice: Choice): number {
  if (choice.services.length === 0) return 0
  return timed(choice) ? 3 : 2
}

/** The step the address asks for, held back to what the choice reaches (a shared link past its services opens them). */
export function currentStep(asked: Step | undefined, choice: Choice): Step {
  const index = Math.min(STEPS.indexOf(asked ?? 'services'), reachedStep(choice))
  return STEPS[index] ?? 'services'
}

/** Whether the step's own choice is made, so Continue goes on (Booking `valid`). */
export function stepDone(step: Step, choice: Choice): boolean {
  if (step === 'services' || step === 'staff') return choice.services.length > 0
  return timed(choice)
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening'

/** The time step's groups (Booking `GR`): before 12:00, before 17:00, then the evening (and the night after it). */
export function partOfDay(min: number): PartOfDay {
  if (min < 720) return 'morning'
  return min < 1020 ? 'afternoon' : 'evening'
}

/** The free times by part of day, in order, without empty parts. */
export function slotsByPart<S extends { start: number }>(slots: readonly S[]): { part: PartOfDay; slots: S[] }[] {
  const parts: PartOfDay[] = ['morning', 'afternoon', 'evening']
  return parts.map((part) => ({ part, slots: slots.filter((s) => partOfDay(s.start) === part) })).filter((g) => g.slots.length > 0)
}
