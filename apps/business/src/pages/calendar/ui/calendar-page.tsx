import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { BusinessHours } from '@yeral/domain/hours'
import { addDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { useClock } from '@yeral/ui/clock'
import { DatePicker } from '@yeral/ui/date-picker'
import { cn } from '@yeral/ui/cn'
import { Pill, pillVariants } from '@yeral/ui/pill'
import { Spinner } from '@yeral/ui/spinner'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useDatePickerWords } from '@/shared/i18n'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import type { CalendarSearch } from '../model/search'
import { DayGrid } from './day-grid'
import { RequestDrawer } from './request-drawer'

/**
 * The calendar's day (B-Calendar, design §4 and §27.4, book B-16): `?date=` (today without it), the toolbar (Today,
 * the day before and after, the day's date to pick another, how many requests wait, Show cancelled), the day's line
 * («16 bookings · 3 requests · Revenue (planned): 1,410 TMT») and the grid of everyone the reader sees. It follows the
 * workspace's events, so a request or an answer shows within a moment.
 */
export function CalendarPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <Calendar key={workspace.slug} slug={workspace.slug} specialist={workspace.level === 'specialist'} />
}

function Calendar({ slug, specialist }: { slug: string; specialist: boolean }) {
  const t = useTranslations('calendar')
  const sections = useTranslations('shell.sections')
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const words = useDatePickerWords()
  const now = useClock()
  const navigate = useNavigate()
  const search: CalendarSearch = useSearch({ strict: false })
  const todayDate = today(now)
  const date = search.date ?? todayDate
  const cancelled = !!search.cancelled
  const view = useQuery({
    ...sdk.calendar.view(slug, { date, days: 1, cancelled, lang: locale }),
    // the day on screen stays while the next one loads
    placeholderData: keepPreviousData,
  })
  // the business's hours, for the timers that count only while it's open (a specialist doesn't read them: wall time)
  const hours = useQuery({ ...sdk.settings.hours(slug), enabled: !specialist, retry: false })
  const business: BusinessHours | null = hours.data ? { hours: hours.data.hours, exceptions: hours.data.specialDays } : null

  const go = (patch: Partial<CalendarSearch>, replace = false) =>
    void navigate({ to: '.', search: (prev: CalendarSearch) => ({ ...prev, ...patch }), replace })
  // another day: the booking picked on this one goes
  const goDay = (next: string) => go({ date: next === todayDate ? undefined : next, booking: undefined })
  // the waiting requests, most urgent first: the chip opens the first (B-Calendar `openQueue`)
  const queue = useQuery(sdk.requests.list(slug)).data?.items ?? []
  const openRequest = (code: string) => go({ request: code, booking: undefined }, true)

  if (view.isError && (!view.data || view.isPlaceholderData)) throw view.error
  // the day the data is for: the one before while the next loads
  const shown = view.data?.from ?? date
  const summary = view.data?.summary.find((d) => d.date === shown)
  // a client's move waits for an answer as a request does (B-Calendar counts its ghost)
  const moves = view.data?.moves.filter((m) => m.date === shown).length ?? 0
  const requests = (summary?.requests ?? 0) + moves
  const first = queue[0]
  const bold = (chunks: ReactNode) => <b className="font-semibold text-n-900 tabular-nums">{chunks}</b>
  const dot = (
    <span aria-hidden className="text-n-500">
      {t('dot')}
    </span>
  )

  return (
    <WorkspacePage title={sections('calendar')} switcherOnPhone flush>
      <div className="flex flex-none flex-col gap-2.5 border-b border-n-200 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="s" onClick={() => goDay(todayDate)}>
            {t('today')}
          </Button>
          <span className="flex flex-none items-center gap-0.5">
            <Button variant="ghost" size="s" iconOnly aria-label={t('prev')} onClick={() => goDay(addDays(date, -1))}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="s" iconOnly aria-label={t('next')} onClick={() => goDay(addDays(date, 1))}>
              <ChevronRight />
            </Button>
          </span>
          <DatePicker
            look="title"
            copy={{ ...words, value: fmt.weekdayDate, placeholder: t('pickDate') }}
            today={todayDate}
            value={date}
            onValueChange={goDay}
          />
          <span className="flex-1" />
          {first ? (
            <button
              type="button"
              onClick={() => openRequest(first.code)}
              className={cn(
                pillVariants({ tone: 'warning', size: 'l' }),
                'h-9 cursor-pointer gap-1.5 px-3.5 text-small hover:border-st-pending-dot focus-visible:shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-a-400)] focus-visible:outline-none',
              )}
            >
              <Clock aria-hidden />
              {t('requests', { n: queue.length })}
              {/* its name starts with what it shows (B-Calendar: «6 unanswered requests — open the most urgent») */}
              <span className="sr-only">{t('openMostUrgent')}</span>
            </button>
          ) : (
            <Pill tone="neutral" size="l" className="h-9 px-3.5 text-small">
              {t('noRequests')}
            </Pill>
          )}
          <Checkbox
            label={t('showCancelled')}
            checked={cancelled}
            onChange={(e) => go({ cancelled: e.target.checked ? true : undefined })}
            className="min-h-11 font-medium"
          />
        </div>
        {summary && (
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-n-600">
            <span>{t.rich('bookings', { n: summary.count, b: bold })}</span>
            {dot}
            <span>{t.rich('requestsLine', { n: requests, b: bold })}</span>
            {summary.revenue !== null && (
              <>
                {dot}
                <span>
                  {/* a day gone by: what it earned, no longer planned */}
                  {t.rich(specialist ? 'earnings' : 'revenue', {
                    past: shown < todayDate ? 'yes' : 'no',
                    amount: fmt.money(summary.revenue),
                    b: bold,
                  })}
                </span>
              </>
            )}
          </p>
        )}
      </div>
      {view.data ? (
        <DayGrid
          view={view.data}
          date={shown}
          now={now}
          business={business}
          picked={search}
          busy={view.isPlaceholderData}
          onOpen={(pick) =>
            'request' in pick
              ? openRequest(pick.request)
              : go({ booking: search.booking === pick.booking ? undefined : pick.booking, request: undefined }, true)
          }
        />
      ) : (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner label={t('loading')} />
        </div>
      )}
      {search.request && (
        <RequestDrawer
          slug={slug}
          code={search.request}
          now={now}
          business={business}
          onGo={openRequest}
          onClose={() => go({ request: undefined }, true)}
        />
      )}
    </WorkspacePage>
  )
}
