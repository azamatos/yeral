import type { BookingSummary } from '@yeral/contract/bookings'

/**
 * What a booking was for, as its lines name it: an appointment's services (joined) and its specialists (each once), a
 * class's session and trainer, a table's area («Check-up», «Dr Döwlet»). The caller joins them with « · ».
 */
export function whatParts(what: BookingSummary['what']): string[] {
  if (what.type === 'appointment')
    return [what.items.map((i) => i.service).join(', '), ...new Set(what.items.map((i) => i.staff).filter((s): s is string => !!s))]
  if (what.type === 'class') return [what.session, ...(what.trainer ? [what.trainer] : [])]
  return [what.area]
}
