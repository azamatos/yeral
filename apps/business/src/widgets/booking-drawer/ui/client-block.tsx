import { Link } from '@tanstack/react-router'
import type { CalendarBooking } from '@yeral/contract/calendar'
import type { ClientCard } from '@yeral/contract/clients'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { CopyField } from '@yeral/ui/copy-field'
import { InfoTip } from '@yeral/ui/info-tip'
import { NoteRow } from '@yeral/ui/note-row'
import { Pill } from '@yeral/ui/pill'
import { Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON, useJoin } from '@/entities/booking'
import { TrustedTag } from '@/entities/client'

/** The last visits the drawer lists (B-Calendar «Recent visits»). */
export const RECENT_VISITS = 3

/** The hidden part of a name («Call» and, for the screen reader, whose number). */
const hidden = (chunks: ReactNode) => <span className="sr-only">{chunks}</span>

/**
 * The client in the booking drawer as one card (B7-Booking `.ccard`, v0.7 · B4): the name is the link to the card,
 * the number with its copy button, the tags, the facts (visits, last visit, no-shows) as labelled facts, the notes
 * «shown when they book» as note rows, and Call and «Book again» as two equal buttons. The card comes from the page's
 * cache (`sdk.clients.card`), so a booking opens before it's read.
 */
export function ClientBlock({
  slug,
  client,
  card,
  onBookAgain,
}: {
  slug: string
  client: CalendarBooking['client']
  card: ClientCard | undefined
  onBookAgain?: () => void
}) {
  const t = useTranslations('bookingDrawer.booking')
  const fmt = useFmt()
  const name = client.name ?? t('unnamed')
  const tags = card
    ? [
        ...card.segments.map((s) => ({ key: `s:${s}`, label: t(`segments.${s}`), reported: s === 'flagged' })),
        ...card.tags.map((tag) => ({ key: `t:${tag}`, label: tag, reported: false })),
      ]
    : []
  const alerts = card?.notes.filter((n) => n.alert) ?? []
  return (
    <div className="flex flex-col gap-4 rounded-ctl-l border border-n-200 bg-n-0 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={client.name ?? ''} size={40} letters={1} tone="tint" decorative />
        <span className="flex min-w-0 flex-1 flex-col">
          {/* the name is the Link to the card (A4): no bare «Open the client's card» */}
          {client.id ? (
            <Link
              to="/w/$slug/clients/$id"
              params={{ slug, id: client.id }}
              className={cn(
                'self-start text-[16px] leading-6 font-semibold text-n-900',
                'no-underline hover:underline hover:underline-offset-3 focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-a-400',
              )}
            >
              {name}
            </Link>
          ) : (
            <span className="text-[16px] leading-6 font-semibold text-n-900">{name}</span>
          )}
          {client.phone && (
            <CopyField
              variant="inline"
              value={client.phone}
              display={fmt.phone(client.phone)}
              label={t('copyPhone')}
              copy={{ copy: t('copyPhone'), copied: t('copied') }}
              className="text-small text-n-900"
            />
          )}
        </span>
      </div>
      {card && (card.trusted || tags.length > 0 || card.settings.phoneOnly) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Trusted first (v0.7 · D): the mark only, the team answers them quickly */}
          {card.trusted && <TrustedTag size="m" />}
          {tags.map((tag) => (
            <Pill
              key={tag.key}
              size="m"
              tone={tag.reported ? 'danger' : 'neutral'}
              className={tag.reported ? undefined : 'bg-n-0 text-n-900'}
            >
              {tag.label}
            </Pill>
          ))}
          {card.settings.phoneOnly && (
            <span className="inline-flex items-center gap-1">
              <Pill size="m" className="text-n-900">
                {t('phoneOnly')}
              </Pill>
              <InfoTip label={t('phoneOnlyInfoLabel')}>
                {t('phoneOnlyInfo', { byCount: card.settings.phoneOnlyByCount ? 'yes' : 'no' })}
              </InfoTip>
            </span>
          )}
        </div>
      )}
      {card && (
        <dl className="m-0 grid grid-cols-3 gap-3">
          <Fact label={t('facts.visits')} value={card.stats.visits} />
          <Fact label={t('facts.lastVisit')} value={card.stats.lastVisit ? fmt.shortDate(card.stats.lastVisit) : t('facts.never')} />
          {card.stats.noShows > 0 && <Fact label={t('facts.noShows')} value={card.stats.noShows} danger />}
        </dl>
      )}
      {alerts.length > 0 && (
        <div className="flex flex-col">
          {alerts.map((note) => (
            <NoteRow key={note.id} alert meta={t('noteMeta', { by: note.by ?? t('unnamed'), date: fmt.shortDate(localOf(note.at).date) })}>
              {note.text}
            </NoteRow>
          ))}
        </div>
      )}
      {(client.phone || onBookAgain) && (
        <div className="flex gap-2">
          {/* Call and Book again: two equal Secondary M (A4) */}
          {client.phone && (
            <Button asChild variant="secondary" className="flex-1">
              {/* named by what it shows, the rest hidden: the visible word starts the name in every language (axe) */}
              <a href={`tel:${client.phone}`}>
                <Phone aria-hidden />
                {t.rich('callName', { name, phone: fmt.phone(client.phone), hidden })}
              </a>
            </Button>
          )}
          {onBookAgain && (
            <Button variant="secondary" className="flex-1" onClick={onBookAgain}>
              {t('bookAgain')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** One labelled fact (B7-Booking `.fk`): the label 12/16 above the value 14/20. */
function Fact({ label, value, danger }: { label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-micro whitespace-nowrap text-n-600">{label}</dt>
      <dd className={cn('m-0 text-small', danger ? 'font-semibold text-danger-ink' : 'text-n-900')}>{value}</dd>
    </div>
  )
}

/**
 * «Recent visits» (B-Calendar `.hrow`): the client's last three past bookings but the one open, each with its date,
 * what it was, its status with the status's icon and, for the owner and administrators, its price; without any, when
 * they last came and that the card holds the history, or «No earlier visits».
 */
export function RecentVisits({ card, except, prices }: { card: ClientCard | undefined; except: string; prices: boolean }) {
  const t = useTranslations('bookingDrawer.booking')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  if (!card) return null
  const visits = card.history.filter((b) => b.code !== except).slice(0, RECENT_VISITS)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label text-n-500 uppercase">{t('recentVisits')}</span>
      {visits.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {visits.map((b) => {
            const Icon = BOOKING_STATUS_ICON[b.status]
            return (
              <li
                key={b.code}
                className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-3 border-b border-n-200 py-2.25 text-small last:border-b-0"
              >
                <span className="text-dense text-n-600">{fmt.shortDate(b.date)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {join(
                      b.items.map((i) => i.service),
                      'plus',
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-dense whitespace-nowrap text-n-600">
                    <Icon aria-hidden strokeWidth={2} className={cn('size-3', INK[b.status])} />
                    {s(b.status)}
                  </span>
                </span>
                {prices && b.price && <span className="font-semibold">{fmt.price(b.price)}</span>}
              </li>
            )
          })}
        </ul>
      ) : (
        <span className="text-dense text-n-600">
          {card.stats.lastVisit ? t('lastVisit', { date: fmt.shortWeekdayDate(card.stats.lastVisit) }) : t('noVisits')}
        </span>
      )}
    </div>
  )
}

/** The status icon's ink in a visit's row (the badges' inks). */
const INK: Record<CalendarBooking['status'], string> = {
  pending: 'text-st-pending-ink',
  confirmed: 'text-st-confirmed-ink',
  completed: 'text-st-completed-ink',
  cancelled: 'text-st-cancelled-ink',
  noshow: 'text-st-noshow-ink',
}
