import { isApiError } from '@yeral/sdk'
import { useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'

const UNDO_REASONS = ['slot_taken', 'session_full', 'already_started', 'request_expired'] as const

/**
 * Why Undo after the client's own cancel didn't bring the booking back (Account-Bookings `undoFailed`): the shared
 * «Couldn't undo — this time was already given to another client.», or the error's own words for anything else.
 */
export function useUndoFailed() {
  const words = useTranslations()
  const errorText = useErrorText()
  return (error: unknown) => {
    const why = UNDO_REASONS.find((r) => isApiError(error, r))
    return why ? words('undo.failed', { reason: words(`undo.reasons.${why}`) }) : errorText(error)
  }
}
