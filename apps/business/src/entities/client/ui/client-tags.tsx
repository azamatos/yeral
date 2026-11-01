import type { ClientSegment } from '@yeral/domain/clients'
import { Pill } from '@yeral/ui/pill'
import { useTranslations } from 'use-intl'

/** A client's tags (B-Clients, B-Client `ClientTag`): Phone only first, then what's worked out, then the team's own. */
export function ClientTags({
  phoneOnly,
  segments,
  tags,
  size = 's',
}: {
  phoneOnly: boolean
  segments: readonly ClientSegment[]
  tags: readonly string[]
  size?: 's' | 'm'
}) {
  const t = useTranslations('clients')
  return (
    <>
      {phoneOnly && (
        <Pill tone="warning" size={size}>
          {t('phoneOnly')}
        </Pill>
      )}
      {segments.map((s) => (
        <Pill key={s} tone={s === 'flagged' ? 'danger' : 'neutral'} size={size}>
          {t(`segments.${s}`)}
        </Pill>
      ))}
      {tags.map((tag) => (
        <Pill key={tag} tone="neutral" size={size}>
          {tag}
        </Pill>
      ))}
    </>
  )
}
