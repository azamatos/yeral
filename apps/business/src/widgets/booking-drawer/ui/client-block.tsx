import type { CalendarBooking } from '@yeral/contract/calendar'
import type { ClientCard } from '@yeral/contract/clients'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { Pill } from '@yeral/ui/pill'
import { Phone, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON, useJoin } from '@/entities/booking'

/** The last visits the drawer lists (B-Calendar «Recent visits»). */
export const RECENT_VISITS = 3

/** The hidden part of a name («Call» and, for the screen reader, whose number). */
const hidden = (chunks: ReactNode) => <span className="sr-only">{chunks}</span>

/**
 * The client in the booking drawer (B-Calendar `.cli`, DS-Business BookingDrawer): the name and number, their facts
 * from the card («12 visits · average check 145 TMT», no-shows, Phone only), Call and «Book again», and the link to
 * the card. The card comes from the page's cache (`sdk.clients.card`), so a booking opens before it's read.
 */
export function ClientBlock({
  client,
  card,
  onBookAgain,
}: {
  client: CalendarBooking['client']
  card: ClientCard | undefined
  onBookAgain?: () => void
}) {
  const t = useTranslations('bookingDrawer.booking')
  const fmt = useFmt()
  const name = client.name ?? t('unnamed')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Avatar name={client.name ?? ''} size={40} letters={1} tone="tint" decorative />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] leading-[22px] font-semibold text-n-900">{name}</span>
          {client.phone && <span className="text-dense text-n-600 tabular-nums">{fmt.phone(client.phone)}</span>}
          {card && (
            <span className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-dense text-n-600">
                {t('visits', { n: card.stats.visits })}
                {/* the average only with «See revenue» (the api leaves it out otherwise) */}
                {card.stats.avgCheck !== null && t('avgCheck', { amount: fmt.money(card.stats.avgCheck) })}
              </span>
              {card.stats.noShows > 0 && <Pill tone="danger">{t('noShows', { n: card.stats.noShows })}</Pill>}
              {card.settings.phoneOnly && <Pill tone="warning">{t('phoneOnly')}</Pill>}
            </span>
          )}
          <span className="flex flex-wrap gap-2 pt-2.5">
            {client.phone && (
              <Button asChild variant="secondary" size="s">
                {/* named by what it shows, the rest hidden: the visible word starts the name in every language (axe) */}
                <a href={`tel:${client.phone}`}>
                  <Phone aria-hidden />
                  {t.rich('callName', { name, phone: fmt.phone(client.phone), hidden })}
                </a>
              </Button>
            )}
            {onBookAgain && (
              <Button variant="ghost" size="s" onClick={onBookAgain}>
                {t('bookAgain')}
              </Button>
            )}
          </span>
        </span>
      </div>
      {/* «Open the client's card →» (book B-34, `/w/{slug}/clients/{id}`) joins with the card's route (slice 4's B11): a
          router `Link`, so an unsent note still goes */}
    </div>
  )
}

/** The client's notes «shown when they book» (B-Calendar `.wbox`): one callout each, the whole team sees them. */
export function AlertNotes({ card }: { card: ClientCard | undefined }) {
  const t = useTranslations('bookingDrawer.booking')
  const alerts = card?.notes.filter((n) => n.alert) ?? []
  return (
    <>
      {alerts.map((note) => (
        <Callout
          key={note.id}
          tone="warning"
          size="s"
          icon={<TriangleAlert aria-hidden />}
          title={<span className="text-label uppercase">{t('alert')}</span>}
        >
          {note.text}
        </Callout>
      ))}
    </>
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
                <span className="text-dense text-n-600 tabular-nums">{fmt.shortDate(b.date)}</span>
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
                {prices && b.price && <span className="font-semibold tabular-nums">{fmt.price(b.price)}</span>}
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
