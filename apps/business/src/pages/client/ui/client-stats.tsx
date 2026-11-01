import type { ClientCard } from '@yeral/contract/clients'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { StatRow, StatTile } from '@yeral/ui/stat-tile'
import { useFormatter, useTranslations } from 'use-intl'
import { useWhat } from '../model/use-what'

/**
 * The key figures (B-Client `.stats`): visits, the average check for those who see revenue, the last visit with what it
 * was, the no-shows with their days. The captions read the history on the card, so an older visit leaves its out.
 */
export function ClientStats({ card, now, money, specialist }: { card: ClientCard; now: number; money: boolean; specialist: boolean }) {
  const t = useTranslations('clientCard.stats')
  const fmt = useFmt()
  const format = useFormatter()
  const what = useWhat()
  const { visits, avgCheck, lastVisit, noShows } = card.stats
  const last = card.history.find((b) => b.status === 'completed' && b.date === lastVisit)
  const missed = card.history.filter((b) => b.status === 'noshow').slice(0, 2)
  const day = (date: string) => fmt.relativeShortDate(date, today(now))
  return (
    <div className="border-t border-n-200 pt-6 pb-7">
      <StatRow columns={money ? 4 : 3} aria-label={t('label')}>
        <StatTile size="m" label={t('visits')} value={visits} caption={specialist ? t('withYou') : undefined} />
        {money && (
          <StatTile size="m" label={t('average')} value={avgCheck !== null ? fmt.money(avgCheck) : '—'} caption={t('averageCaption')} />
        )}
        <StatTile size="m" label={t('last')} value={lastVisit ? day(lastVisit) : '—'} caption={last ? what(last) : undefined} />
        <StatTile
          size="m"
          label={t('noShows')}
          value={noShows}
          caption={missed.length ? format.list(missed.map((b) => day(b.date))) : undefined}
        />
      </StatRow>
    </div>
  )
}
