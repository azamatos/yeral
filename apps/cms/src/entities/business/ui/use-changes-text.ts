import type { RecheckChange } from '@yeral/domain/model'
import { useFormatter, useTranslations } from 'use-intl'

/** What a live business changed since it was checked (book Q-215, Q-275), as a list in words: «address, About and photos». */
export function useChangesText(): (what: readonly RecheckChange[]) => string {
  const t = useTranslations('businesses.change')
  const format = useFormatter()
  return (what) => format.list(what.map((c) => t(c)))
}
