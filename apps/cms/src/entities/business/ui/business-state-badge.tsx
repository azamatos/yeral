import { Pill, type PillProps } from '@yeral/ui/pill'
import { useTranslations } from 'use-intl'
import type { BusinessState } from '../model/state'

const TONES: Record<BusinessState, PillProps['tone']> = {
  draft: 'neutral',
  closed: 'slate',
  hidden: 'danger',
  rejected: 'danger',
  review: 'warning',
  moved: 'warning',
  verified: 'success',
}

/** A business's state in a word, in a list row and over its page. */
export function BusinessStateBadge({ state }: { state: BusinessState }) {
  const t = useTranslations('businesses.state')
  return <Pill tone={TONES[state]}>{t(state)}</Pill>
}
