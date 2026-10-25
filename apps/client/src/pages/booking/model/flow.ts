import { isYmd, parseHm } from '@yeral/domain/time'
import { z } from 'zod'

/**
 * The booking flow's address (Booking, book C-12–C-14; client spec «keep `step, services, staff, date, time` in the
 * URL»): what's picked, so a reload, a shared link and Back keep the flow where it was. Anything unreadable is dropped,
 * not an error.
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
  time: z
    .string()
    .refine((t) => parseHm(t) !== null)
    .optional()
    .catch(undefined),
  step: z.enum(['services', 'staff', 'time', 'confirm']).optional().catch(undefined),
})
export type BookingSearch = z.infer<typeof bookingSearchSchema>

export const STEPS = ['services', 'staff', 'time', 'confirm'] as const
export type Step = (typeof STEPS)[number]

/** Whether the specialist does every picked service (Booking `can(pid)`). */
export const doesAll = (specialist: { serviceIds: readonly string[] }, serviceIds: readonly string[]) =>
  serviceIds.length > 0 && serviceIds.every((id) => specialist.serviceIds.includes(id))

/** The chosen specialist while they still do every picked service; otherwise «any» (a new service may rule them out). */
export function chosenStaff(
  detail: { specialists: readonly { id: string; serviceIds: readonly string[] }[] },
  serviceIds: readonly string[],
  staff: string | undefined,
): string {
  if (!staff || staff === 'any') return 'any'
  const specialist = detail.specialists.find((s) => s.id === staff)
  return specialist && doesAll(specialist, serviceIds) ? staff : 'any'
}

/**
 * The furthest step the choice reaches: the services first; with one picked, the specialist (always answered: «any»
 * by default) and the time; with a time, the confirmation.
 */
export function reachedStep(choice: { services: readonly string[]; time: number | null }): number {
  if (choice.services.length === 0) return 0
  return choice.time === null ? 2 : 3
}

/** The step the address asks for, held back to what the choice reaches (a shared link past its services opens them). */
export function currentStep(asked: Step | undefined, choice: { services: readonly string[]; time: number | null }): Step {
  const index = Math.min(STEPS.indexOf(asked ?? 'services'), reachedStep(choice))
  return STEPS[index] ?? 'services'
}

/** Whether the step's own choice is made, so Continue goes on (Booking `valid`). */
export function stepDone(step: Step, choice: { services: readonly string[]; time: number | null }): boolean {
  if (step === 'services' || step === 'staff') return choice.services.length > 0
  return choice.time !== null
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening'

/** The time step's groups (Booking `GR`): before 12:00, before 17:00, then the evening. */
export function partOfDay(min: number): PartOfDay {
  if (min < 720) return 'morning'
  return min < 1020 ? 'afternoon' : 'evening'
}

/** The free times by part of day, in order, without empty parts. */
export function slotsByPart<S extends { start: number }>(slots: readonly S[]): { part: PartOfDay; slots: S[] }[] {
  const parts: PartOfDay[] = ['morning', 'afternoon', 'evening']
  return parts.map((part) => ({ part, slots: slots.filter((s) => partOfDay(s.start) === part) })).filter((g) => g.slots.length > 0)
}
