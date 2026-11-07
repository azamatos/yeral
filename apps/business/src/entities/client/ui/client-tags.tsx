import type { ClientSegment } from '@yeral/domain/clients'
import { TagChip } from '@yeral/ui/chip'
import { Clock, Flag, Phone, Repeat, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'use-intl'

const ICONS: Record<ClientSegment, LucideIcon> = { new: Sparkles, regular: Repeat, lapsed: Clock, flagged: Flag }

type TagsOf = { trusted?: boolean; phoneOnly: boolean; segments: readonly ClientSegment[]; tags?: readonly string[]; size?: 's' | 'm' }

/**
 * «Trusted» (C7-Booking D2, design v0.7): the automatic tag in the completed tones with a shield-check, first among a
 * client's tags, never removable; the tooltip says what it means. The business sees the mark only, never the visits
 * elsewhere.
 */
export function TrustedTag({ size = 's' }: { size?: 's' | 'm' }) {
  const t = useTranslations('clients')
  return (
    <TagChip size={size} kind="trusted" icon={<ShieldCheck aria-hidden />} title={t('trustedTip')}>
      {t('trusted')}
    </TagChip>
  )
}

/**
 * A client's tags as a flat list of chips (DS-Lists A8), so a table cell can count them for «+N»: the ones Ýeral sets
 * from the bookings first — outlined with an icon, never removable, the tooltip says where they come from; Trusted,
 * Phone only, then what's worked out, Reported in the danger outline — then the team's own (`tags`).
 */
export function useClientTagChips() {
  const t = useTranslations('clients')
  return ({ trusted = false, phoneOnly, segments, tags = [], size = 's' }: TagsOf) => [
    ...(trusted ? [<TrustedTag key="trusted" size={size} />] : []),
    ...(phoneOnly
      ? [
          <TagChip key="phone-only" size={size} kind="automatic" icon={<Phone aria-hidden />} title={t('autoTag')}>
            {t('phoneOnly')}
          </TagChip>,
        ]
      : []),
    ...segments.map((s) => {
      const Icon = ICONS[s]
      return (
        <TagChip key={s} size={size} kind={s === 'flagged' ? 'reported' : 'automatic'} icon={<Icon aria-hidden />} title={t('autoTag')}>
          {t(`segments.${s}`)}
        </TagChip>
      )
    }),
    ...tags.map((tag) => (
      <TagChip key={`tag-${tag}`} size={size}>
        {tag}
      </TagChip>
    )),
  ]
}

/** The automatic tags alone, before the card's editable ones. */
export function ClientAutoTags(props: Omit<TagsOf, 'tags'>) {
  return <>{useClientTagChips()(props)}</>
}
