/**
 * A business's booking rules ("Ýazylyş düzgünleri", business spec §8 and decisions §11; ADR 0017).
 * The option lists are what the settings screen offers; the api accepts only these values.
 */
import type { ConfirmMode } from './model'

/**
 * Who answers requests in manual mode (book chapter 3): `desk` "Administrator we eýesi", `each` "Her hünärmen özi",
 * `both` "Ikisi hem" (whoever is first). The owner always can.
 */
export const REQUEST_ANSWERERS = ['desk', 'each', 'both'] as const
export type RequestAnswerers = (typeof REQUEST_ANSWERERS)[number]

export interface BookingRules {
  /** "Onlaýn ýazylyş"; off = the client site shows online booking as paused. */
  onlineEnabled: boolean
  confirmMode: ConfirmMode
  /** Who answers requests (manual mode). */
  requestAnswerers: RequestAnswerers
  /** How long a request holds its slot before it expires (manual mode). */
  holdMinutes: number
  /** Minimum time between now and a booking's start; 0 = no limit ("Çäk ýok"). */
  leadMinutes: number
  /** How many days ahead the calendar is open, today included as day 0. */
  windowDays: number
  /** Free time after a visit; a service may override it. */
  bufferMinutes: number
  /** Start times are multiples of this many minutes. */
  slotStep: number
  /** A client may cancel or move a confirmed booking until this many minutes before it starts; null = any time. */
  cancelWindowMinutes: number | null
  /** Ask the client why they cancel. */
  askCancelReason: boolean
  /** After this many no-shows a client can book only by phone; 0 = never. */
  blockAfterNoShows: number
  /** How late a client may be before the booking can be cancelled (shown in the rules; tables are held this long). */
  lateToleranceMinutes: number
}

export const RULE_OPTIONS = {
  holdMinutes: [15, 30, 60, 120, 360, 1440],
  leadMinutes: [0, 30, 60, 120, 240, 1440],
  windowDays: [7, 14, 30, 60, 90],
  /** Presets; "custom" allows 1–120. */
  bufferMinutes: [0, 5, 10, 15, 20, 30],
  slotStep: [15, 30],
  /** null = "Islendik wagt" (any time). */
  cancelWindowMinutes: [null, 60, 120, 360, 720, 1440, 2880],
  blockAfterNoShows: [0, 1, 2, 3, 4, 5],
} as const

export const BUFFER_MAX = 120

export const DEFAULT_RULES: BookingRules = {
  onlineEnabled: true,
  confirmMode: 'manual',
  requestAnswerers: 'both',
  holdMinutes: 30,
  leadMinutes: 60,
  windowDays: 30,
  bufferMinutes: 10,
  slotStep: 15,
  cancelWindowMinutes: 120,
  askCancelReason: true,
  blockAfterNoShows: 2,
  lateToleranceMinutes: 15,
}

/** Problems with a rules object, by field; empty when valid. */
export function rulesErrors(r: BookingRules): Partial<Record<keyof BookingRules, 'invalid'>> {
  const errors: Partial<Record<keyof BookingRules, 'invalid'>> = {}
  const oneOf = <K extends keyof typeof RULE_OPTIONS>(k: K) => {
    if (!(RULE_OPTIONS[k] as readonly (number | null)[]).includes(r[k])) errors[k] = 'invalid'
  }
  oneOf('holdMinutes')
  oneOf('leadMinutes')
  oneOf('windowDays')
  oneOf('slotStep')
  oneOf('cancelWindowMinutes')
  oneOf('blockAfterNoShows')
  if (!REQUEST_ANSWERERS.includes(r.requestAnswerers)) errors.requestAnswerers = 'invalid'
  if (!Number.isInteger(r.bufferMinutes) || r.bufferMinutes < 0 || r.bufferMinutes > BUFFER_MAX) errors.bufferMinutes = 'invalid'
  if (!Number.isInteger(r.lateToleranceMinutes) || r.lateToleranceMinutes < 0 || r.lateToleranceMinutes > 120) {
    errors.lateToleranceMinutes = 'invalid'
  }
  return errors
}
