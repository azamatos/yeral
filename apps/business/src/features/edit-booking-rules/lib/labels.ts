import type { RequestAnswerers } from '@yeral/domain/rules'
import { useFmt } from '@yeral/i18n'
import { useTranslations } from 'use-intl'

/** The message keys of each «Who answers requests?» choice; `${key}Caption` is its line under it. */
export const ANSWERER_KEY: Record<RequestAnswerers, 'whoDesk' | 'whoEach' | 'whoBoth'> = {
  desk: 'whoDesk',
  each: 'whoEach',
  both: 'whoBoth',
}

/** How a rule's choices read in a select («60 min», «Up to 2 h before», «No limit»), the same in the wizard and Settings. */
export function useRuleLabels() {
  const t = useTranslations('bookingRules')
  const fmt = useFmt()
  return {
    hold: (m: number) => fmt.duration(m),
    lead: (m: number) => (m === 0 ? t('leadNone') : fmt.duration(m)),
    window: (days: number) => t('days', { n: days }),
    buffer: (m: number) => (m === 0 ? t('bufferNone') : fmt.duration(m)),
    cancel: (m: number | null) => (m === null ? t('cancelAny') : t('cancelBefore', { hours: m / 60 })),
    noShows: (n: number) => (n === 0 ? t('noShowsOff') : t('noShowsTimes', { n })),
  }
}
