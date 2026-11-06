import type { CalendarView } from '@yeral/contract/calendar'
import { addDays } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { cn } from '@yeral/ui/cn'
import { Meter } from '@yeral/ui/meter'
import { useTranslations } from 'use-intl'
import { weekCell, type WeekCell } from '../model/grid'

/**
 * The week's load (B-Calendar `weekAll`, book B-17 step 3): a row per person, a column per day, each cell a bar of how
 * much of the working time is booked with «5 bookings · 62%» and the requests under it; a cell opens that day.
 */
export function WeekAll({
  view,
  from,
  today,
  onDay,
}: {
  view: CalendarView
  /** The week's Monday. */
  from: string
  today: string
  onDay: (date: string, staffId: string) => void
}) {
  const t = useTranslations('calendar.week')
  const c = useTranslations('calendar')
  const layers = useTranslations('calendar.layers')
  const fmt = useFmt()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const offLabel = (off: NonNullable<WeekCell['off']>) =>
    off === 'none' || off.kind === 'dayoff' ? layers('dayOff') : off.kind === 'timeoff' ? layers('timeOff') : layers('closed')
  const rows = view.columns.map((column) => ({ column, cells: days.map((d) => weekCell(view, column, d)) }))
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div role="table" aria-label={t('table')} className="grid min-w-265 grid-cols-[220px_repeat(7,minmax(120px,1fr))]">
        <div role="row" className="contents">
          <div role="columnheader" className="flex h-16 items-center border-b border-n-200 pr-3.5 pl-8 text-label text-n-500 uppercase">
            {c('specialist')}
          </div>
          {days.map((d, i) => (
            <div
              key={d}
              role="columnheader"
              className="flex h-16 flex-col items-start justify-center gap-0.5 border-b border-l border-n-200 px-3.5"
            >
              <span
                className={cn(
                  '-ml-2 inline-flex h-6 items-center rounded-pill px-2 text-[14px] leading-[18px] font-semibold whitespace-nowrap',
                  d === today && 'bg-a-50 text-a-600',
                )}
              >
                {t('day', { weekday: fmt.weekdayShort(d), day: Number(d.slice(8)) })}
              </span>
              <span className="text-dense text-n-600">
                {c('columnBookings', { n: rows.reduce((sum, r) => sum + (r.cells[i]?.bookings ?? 0), 0) })}
              </span>
            </div>
          ))}
        </div>
        {rows.map(({ column: person, cells }) => (
          <div key={person.staffId} role="row" className="contents">
            <div role="rowheader" className="flex min-w-0 items-center gap-2.5 border-b border-n-200 py-3.5 pr-4 pl-8">
              <Avatar name={person.name} src={person.photo?.url} size={32} letters={1} tone="tint" decorative />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] leading-5 font-semibold text-n-900">{person.name}</span>
                {!person.hasApp && <span className="text-dense text-n-600">{c('noApp')}</span>}
              </span>
            </div>
            {cells.map((cell) => {
              const off = cell.off && offLabel(cell.off)
              const count = c('columnBookings', { n: cell.bookings })
              return (
                <div key={cell.date} role="cell" className="contents">
                  <button
                    type="button"
                    onClick={() => onDay(cell.date, person.staffId)}
                    className={cn(
                      'flex min-h-23 cursor-pointer flex-col items-stretch gap-2 border-0 border-b border-l border-solid border-n-200 bg-transparent p-3.5 text-left hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none',
                      off && 'justify-center bg-n-50',
                    )}
                  >
                    {/* who and when for a screen reader, before what the cell shows (its words stay its name) */}
                    <span className="sr-only">{t('cell', { name: person.name, date: fmt.weekdayDate(cell.date) })}</span>
                    {off ? (
                      <span className="text-[13px] leading-[18px] font-semibold text-n-600">{off}</span>
                    ) : (
                      <>
                        <Meter aria-hidden label={t('percent', { percent: cell.percent })} value={cell.percent} max={100} />
                        <span className="flex flex-wrap items-baseline justify-between gap-x-1.5 text-[14px] leading-[18px] font-semibold">
                          <span className="whitespace-nowrap">{count}</span>
                          <span className="text-[12px] leading-4 font-medium whitespace-nowrap text-n-600">
                            {t('percent', { percent: cell.percent })}
                          </span>
                        </span>
                        {cell.requests > 0 && (
                          <span className="text-[13px] leading-[18px] font-semibold text-st-pending-ink">
                            {c('requests', { n: cell.requests })}
                          </span>
                        )}
                      </>
                    )}
                    <span className="sr-only">{t('open')}</span>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="m-0 px-8 pt-3.5 pb-6 text-dense text-n-600">{t('note')}</p>
    </div>
  )
}
