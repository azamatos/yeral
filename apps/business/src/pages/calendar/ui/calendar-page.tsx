import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { BusinessHours } from '@yeral/domain/hours'
import type { Level } from '@yeral/domain/permissions'
import { addDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Avatar } from '@yeral/ui/avatar'
import { Checkbox } from '@yeral/ui/checkbox'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { DatePicker } from '@yeral/ui/date-picker'
import { cn } from '@yeral/ui/cn'
import { Pill, pillVariants } from '@yeral/ui/pill'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import { BlockTimeModal, type BlockSlot } from '@/features/block-time'
import { NewBookingDrawer } from '@/features/create-booking'
import { MoveBar, MoveConfirm, useMoveBooking } from '@/features/move-booking'
import { useSdk } from '@/shared/api'
import { useDatePickerWords } from '@/shared/i18n'
import { BookingDrawer, RequestDrawer } from '@/widgets/booking-drawer'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import { gridHours, mondayOf } from '../model/grid'
import type { CalendarSearch } from '../model/search'
import { CalendarLegend } from './calendar-legend'
import { DayGrid } from './day-grid'
import { WeekAll } from './week-all'
import { WeekOne } from './week-one'

/**
 * The calendar's day (B-Calendar, design §4 and §27.4, book B-16): `?date=` (today without it), the toolbar (Today,
 * the day before and after, the day's date to pick another, how many requests wait, Show cancelled), the day's line
 * («16 bookings · 3 requests · Revenue (planned): 1,410 TMT») and the grid of everyone the reader sees. It follows the
 * workspace's events, so a request or an answer shows within a moment.
 */
export function CalendarPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <Calendar key={workspace.slug} slug={workspace.slug} level={workspace.level} />
}

function Calendar({ slug, level }: { slug: string; level: Level }) {
  const specialist = level === 'specialist'
  const t = useTranslations('calendar')
  const moveWords = useTranslations('moveBooking')
  const join = useJoin()
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
  // a specialist has only their own column: the day and week of one person
  const shape = specialist ? (search.view === 'weekOne' || search.view === 'weekAll' ? 'weekOne' : 'dayOne') : (search.view ?? 'dayAll')
  const week = shape === 'weekAll' || shape === 'weekOne'
  const oneOnly = shape === 'dayOne' || shape === 'weekOne'
  const firstDay = week ? mondayOf(date) : date
  const view = useQuery({
    ...sdk.calendar.view(slug, { date: firstDay, days: week ? 7 : 1, cancelled, lang: locale }),
    // the day on screen stays while the next one loads
    placeholderData: keepPreviousData,
  })
  // the business's hours, for the timers that count only while it's open (a specialist doesn't read them: wall time)
  const hours = useQuery({ ...sdk.settings.hours(slug), enabled: !specialist, retry: false })
  const business: BusinessHours | null = hours.data ? { hours: hours.data.hours, exceptions: hours.data.specialDays } : null
  // the free slot whose «Block time» is open
  const [blocking, setBlocking] = useState<BlockSlot | null>(null)

  const go = (patch: Partial<CalendarSearch>, replace = false) =>
    void navigate({ to: '.', search: (prev: CalendarSearch) => ({ ...prev, ...patch }), replace })
  // another day: the booking picked on this one goes
  const goDay = (next: string) => go({ date: next === todayDate ? undefined : next, booking: undefined })
  // a week's cell or head opens that day, as many people as the week showed
  const openDay = (day: string, next?: 'dayOne') => go({ date: day === todayDate ? undefined : day, view: next })
  const step = week ? 7 : 1
  const pickShape = (range: 'day' | 'week', who: 'All' | 'One') => {
    const next = `${range}${who}` as const
    go({ view: next === 'dayAll' ? undefined : next }, true)
  }
  // the waiting requests, most urgent first: the chip opens the first (B-Calendar `openQueue`)
  const queue = useQuery(sdk.requests.list(slug)).data?.items ?? []
  /**
   * A request in the drawer, on its day and with its specialist's column on a phone when it's a whole request (the chip,
   * the pager, «Next request»; the toast's from any page of the workspace, so it goes to the calendar by name); a
   * block's on the day and the person on screen.
   */
  const openRequest = (r: { code: string; date?: string; items?: readonly { staffId: string | null }[] }, replace = true) =>
    void navigate({
      to: '/w/$slug/calendar',
      params: { slug },
      search: (prev: CalendarSearch) => {
        const staff = r.items?.find((i) => i.staffId)?.staffId ?? prev.staff
        return {
          ...(prev.cancelled ? { cancelled: true as const } : {}),
          ...(r.date ? (r.date === today(Date.now()) ? {} : { date: r.date }) : prev.date ? { date: prev.date } : {}),
          ...(staff ? { staff } : {}),
          request: r.code,
        }
      },
      replace,
    })

  if (view.isError && (!view.data || view.isPlaceholderData)) throw view.error
  // the day the data is for: the one before while the next loads
  const shown = view.data?.from ?? date
  const summary = view.data?.summary.find((d) => d.date === shown)
  // a client's move waits for an answer as a request does (B-Calendar counts its ghost)
  const moves = view.data?.moves.filter((m) => m.date === shown).length ?? 0
  const requests = (summary?.requests ?? 0) + moves
  const first = queue[0]
  const columns = view.data?.columns ?? []
  const leaveMove = () => go({ move: undefined }, true)
  const moving = useMoveBooking({ slug, code: search.move, date: shown, now, people: columns, onLeave: leaveMove })
  // the person a phone shows: the address's, else the first
  const phoneStaff = columns.find((c) => c.staffId === search.staff)?.staffId ?? columns[0]?.staffId
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
          <Button variant="secondary" size="s" className="max-sm:h-11" onClick={() => goDay(todayDate)}>
            {t('today')}
          </Button>
          <span className="flex flex-none items-center gap-0.5">
            <Button
              variant="ghost"
              size="s"
              iconOnly
              className="max-sm:size-11"
              aria-label={t(week ? 'prevWeek' : 'prev')}
              onClick={() => goDay(addDays(date, -step))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="s"
              iconOnly
              className="max-sm:size-11"
              aria-label={t(week ? 'nextWeek' : 'next')}
              onClick={() => goDay(addDays(date, step))}
            >
              <ChevronRight />
            </Button>
          </span>
          <DatePicker
            look="title"
            copy={{
              ...words,
              value: week
                ? () => t('weekRange', { from: fmt.dayMonth(firstDay), to: fmt.dayMonth(addDays(firstDay, 6)) })
                : fmt.weekdayDate,
              placeholder: t('pickDate'),
            }}
            today={todayDate}
            value={date}
            onValueChange={goDay}
          />
          <Segmented
            aria-label={t('views.range')}
            size="s"
            className="max-sm:hidden"
            value={week ? 'week' : 'day'}
            onValueChange={(range) => range && pickShape(range as 'day' | 'week', oneOnly ? 'One' : 'All')}
          >
            <SegmentedItem value="day">{t('views.day')}</SegmentedItem>
            <SegmentedItem value="week">{t('views.week')}</SegmentedItem>
          </Segmented>
          {!specialist && (
            <Segmented
              aria-label={t('views.who')}
              size="s"
              className="max-sm:hidden"
              value={oneOnly ? 'one' : 'all'}
              onValueChange={(who) => who && pickShape(week ? 'week' : 'day', who === 'one' ? 'One' : 'All')}
            >
              <SegmentedItem value="all">{t('views.all')}</SegmentedItem>
              <SegmentedItem value="one">{t('views.one')}</SegmentedItem>
            </Segmented>
          )}
          {!specialist && oneOnly && phoneStaff && (
            <Select
              size="s"
              aria-label={t('specialist')}
              className="w-auto max-sm:hidden"
              value={phoneStaff}
              onChange={(e) => go({ staff: e.target.value }, true)}
            >
              {columns.map((c) => (
                <option key={c.staffId} value={c.staffId}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <span className="flex-1" />
          {first ? (
            <button
              type="button"
              onClick={() => openRequest(first)}
              className={cn(
                pillVariants({ tone: 'warning', size: 'l' }),
                'h-9 cursor-pointer gap-1.5 px-3.5 text-small hover:border-st-pending-dot focus-visible:shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-a-400)] focus-visible:outline-none max-sm:h-11',
              )}
            >
              <Clock aria-hidden />
              {t('requests', { n: queue.length })}
              {/* its name starts with what it shows (B-Calendar: «6 unanswered requests — open the most urgent») */}
              <span className="sr-only">{t('openMostUrgent')}</span>
            </button>
          ) : requests > 0 ? (
            // the list not read yet (or not readable): the day's count, as a plain chip
            <Pill tone="warning" size="l" icon={<Clock aria-hidden />} className="h-9 px-3.5 text-small">
              {t('requests', { n: requests })}
            </Pill>
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
          <Button size="s" className="max-sm:hidden" onClick={() => go({ panel: 'new', booking: undefined, move: undefined }, true)}>
            <Plus aria-hidden />
            {t('newBooking')}
          </Button>
          <CalendarLegend statuses={view.data?.internalStatuses ?? []} />
        </div>
        {week && view.data && (
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-n-600">
            {t.rich('weekLine', {
              bookings: t('columnBookings', { n: view.data.summary.reduce((sum, d) => sum + d.count, 0) }),
              requests: t('requests', { n: view.data.summary.reduce((sum, d) => sum + d.requests, 0) + view.data.moves.length }),
              b: bold,
            })}
          </p>
        )}
        {!week && summary && (
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
        {/* on a phone: one person's day at a time, a chip each (B-Calendar `.stchips`; a specialist has only theirs) */}
        {columns.length > 1 && phoneStaff && (
          <ChipRadioGroup
            aria-label={t('specialist')}
            className="-mx-4 flex-nowrap overflow-x-auto px-4 py-0.5 sm:hidden [&>*]:h-11 [&>*]:flex-none [&>*]:gap-2 [&>*]:pl-2"
            value={phoneStaff}
            // the person stays in the address as picked, across days; the booking picked in another column goes
            onValueChange={(staff) => go({ staff, booking: undefined }, true)}
            options={columns.map((c) => ({
              value: c.staffId,
              label: (
                <>
                  <Avatar name={c.name} src={c.photo?.url} size={24} letters={1} tone="tint" decorative />
                  {c.name}
                </>
              ),
            }))}
          />
        )}
      </div>
      {moving.booking && <MoveBar booking={moving.booking} onBack={leaveMove} />}
      {/* the phone's way in (B-Mobile 2, 5c): over the tab bar, the toast taking its place while it shows */}
      {!moving.booking && (
        <Button
          iconOnly
          aria-label={t('newBooking')}
          className="fixed right-4 bottom-[calc(var(--tab-bar)+16px)] z-8 size-14 rounded-pill shadow-[0_8px_24px_rgba(68,41,214,.32)] sm:hidden [body:has([data-sonner-toast])_&]:bottom-[calc(var(--tab-bar)+88px)]"
          onClick={() => go({ panel: 'new', staff: phoneStaff, booking: undefined }, true)}
        >
          <Plus aria-hidden />
        </Button>
      )}
      {view.data && shape === 'weekAll' && (
        <WeekAll view={view.data} from={view.data.from} today={todayDate} onDay={(day) => openDay(day)} />
      )}
      {view.data && shape === 'weekOne' && columns.find((c) => c.staffId === phoneStaff) && (
        <WeekOne
          view={view.data}
          column={columns.find((c) => c.staffId === phoneStaff)!}
          from={view.data.from}
          now={now}
          onDay={(day) => openDay(day, 'dayOne')}
        />
      )}
      {view.data && !week ? (
        <DayGrid
          view={view.data}
          date={shown}
          now={now}
          business={business}
          picked={search}
          phoneStaff={phoneStaff}
          busy={view.isPlaceholderData}
          specialist={specialist}
          only={oneOnly ? phoneStaff : undefined}
          moving={moving.booking ? { booking: moving.booking, target: moving.target, onPick: moving.pick } : undefined}
          onOpen={(pick) =>
            'request' in pick
              ? openRequest({ code: pick.request })
              : go({ booking: search.booking === pick.booking ? undefined : pick.booking, request: undefined, move: undefined }, true)
          }
          onBlock={setBlocking}
          onBook={(slot) => go({ panel: 'new', staff: slot.staffId, start: slot.start }, true)}
        />
      ) : (
        !view.data && (
          <div className="flex flex-1 items-center justify-center py-20">
            <Spinner label={t('loading')} />
          </div>
        )
      )}
      {moving.booking && moving.target && moving.summary && (
        <MoveConfirm
          anchor={moving.target.anchor}
          what={moveWords('what', {
            client: moving.booking.client.name ?? moveWords('unnamed'),
            services: join(
              moving.booking.items.map((i) => i.service),
              'plus',
            ),
          })}
          title={moveWords('title', moving.summary)}
          notify={moving.notify}
          pending={moving.pending}
          onNotify={moving.setNotify}
          onBack={moving.back}
          onConfirm={moving.confirm}
        />
      )}
      {/* «Block time» from a free slot (book B-18); the booking in its way opens in the drawer */}
      {blocking && view.data && (
        <BlockTimeModal
          slug={slug}
          slot={blocking}
          people={columns}
          specialist={specialist}
          hours={gridHours(view.data, shown)}
          today={todayDate}
          now={now}
          bookings={view.data.bookings}
          onOpenBooking={(code) => go({ booking: code, request: undefined }, true)}
          onClose={() => setBlocking(null)}
        />
      )}
      {search.request && (
        <RequestDrawer
          slug={slug}
          code={search.request}
          now={now}
          business={business}
          onGo={openRequest}
          onAnswered={(code) =>
            void navigate({
              to: '.',
              search: (prev: CalendarSearch) => (prev.request === code ? { ...prev, request: undefined } : prev),
              replace: true,
            })
          }
          // the day, as the day buttons go there; under 1280 the drawer covers the day, so it closes to show it
          onShow={(day, staff) =>
            go({
              date: day === todayDate ? undefined : day,
              booking: undefined,
              ...(staff ? { staff } : {}),
              ...(window.matchMedia('(min-width: 1280px)').matches ? {} : { request: undefined }),
            })
          }
          onClose={() => go({ request: undefined }, true)}
        />
      )}
      {search.panel === 'new' && view.data && (
        <NewBookingDrawer
          slug={slug}
          start={{
            date,
            staffId: search.staff,
            start: search.start,
            clientId: search.client,
            serviceIds: search.services?.split(','),
          }}
          people={columns.filter((c) => !c.removed)}
          specialist={specialist}
          now={now}
          onClose={() => go({ panel: undefined, start: undefined, client: undefined, services: undefined }, true)}
        />
      )}
      {/* the booking picked (`?booking=`), one drawer at a time: a request open wins */}
      {search.booking && !search.request && (
        <BookingDrawer
          slug={slug}
          code={search.booking}
          now={now}
          level={level}
          placeholder={view.data?.bookings.find((b) => b.code === search.booking)}
          onMove={(b) => go({ move: b.code, booking: undefined }, true)}
          onBookAgain={(b) =>
            go(
              {
                panel: 'new',
                booking: undefined,
                client: b.client.id ?? undefined,
                services: b.items.flatMap((i) => i.serviceId ?? []).join(',') || undefined,
                staff: b.items[0]?.staffId ?? undefined,
              },
              true,
            )
          }
          onClose={() => go({ booking: undefined }, true)}
        />
      )}
    </WorkspacePage>
  )
}
