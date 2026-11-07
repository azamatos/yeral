import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { BusinessHours } from '@yeral/domain/hours'
import type { Level } from '@yeral/domain/permissions'
import { addDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { localOf } from '@yeral/domain/time'
import { openMinutesBetween } from '@yeral/domain/hours'
import { Button } from '@yeral/ui/button'
import { Avatar } from '@yeral/ui/avatar'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { Spinner } from '@yeral/ui/spinner'
import { TimerPill } from '@yeral/ui/timer-pill'
import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import { BlockTimeModal, type BlockSlot } from '@/features/block-time'
import { NewBookingDrawer } from '@/features/create-booking'
import { MoveBar, MoveConfirm, useMoveBooking } from '@/features/move-booking'
import { useSdk } from '@/shared/api'
import { BookingDrawer, RequestDrawer } from '@/widgets/booking-drawer'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import { gridHours, mondayOf } from '../model/grid'
import { peopleOf, viewFor, type CalendarSearch } from '../model/search'
import { CalendarToolbar } from './calendar-toolbar'
import { DayGrid } from './day-grid'
import { WeekAll } from './week-all'
import { WeekOne } from './week-one'

/**
 * The calendar (B-Calendar, design §4 and §27.4, book B-16; the toolbar and the week from B7-Calendar · B2, B3):
 * `?date=` (today without it), `?view=` and `?staff=` (the people picked, comma-separated; nobody = everyone), the
 * toolbar, the summary line («60 bookings · Revenue (planned): 6,240 TMT») and the day grid or the week of the people
 * picked. It follows the workspace's events, so a request or an answer shows within a moment.
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
  const now = useClock()
  const navigate = useNavigate()
  const search: CalendarSearch = useSearch({ strict: false })
  const todayDate = today(now)
  const date = search.date ?? todayDate
  const cancelled = !!search.cancelled
  const week = search.view === 'weekOne' || search.view === 'weekAll'
  // the people picked in the toolbar (`?staff=` with a `?view=`); `?staff=` alone is the phone's person
  const people = search.view ? peopleOf(search.staff) : []
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
  // a week's head opens that day: one person's (`dayOne` keeps `staff`), or everyone's
  const openDay = (day: string, next?: 'dayOne') => go({ date: day === todayDate ? undefined : day, view: next })
  const pickRange = (range: 'day' | 'week') => go({ view: viewFor(range === 'week', picked) }, true)
  const pickPeople = (next: string[]) => go({ staff: next.join(',') || undefined, view: viewFor(week, next), booking: undefined }, true)
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
  // the people picked who are on the grid (a specialist has only themself)
  const picked = specialist ? [] : columns.length ? people.filter((id) => columns.some((c) => c.staffId === id)) : people
  // the person a phone shows, and whose week it is: the first picked, the address's, else the first
  const phoneStaff = columns.find((c) => c.staffId === (picked[0] ?? peopleOf(search.staff)[0]))?.staffId ?? columns[0]?.staffId
  // the week: one person's grid for one person (a specialist, `weekOne`), the team's matrix for the rest
  const shape = !week ? 'day' : specialist || picked.length === 1 || (search.view === 'weekOne' && !picked.length) ? 'weekOne' : 'weekAll'
  const weekColumns = shape === 'weekAll' && picked.length ? columns.filter((c) => picked.includes(c.staffId)) : columns
  const bold = (chunks: ReactNode) => <b className="font-semibold text-n-600">{chunks}</b>
  // how many bookings are on screen, and what they're worth (See revenue): the day's, or the week's of the people shown
  const shownBookings = view.data
    ? week
      ? view.data.bookings.filter(
          (b) => b.status !== 'cancelled' && (!weekColumns.length || b.items.some((i) => weekColumns.some((c) => c.staffId === i.staffId))),
        ).length
      : (summary?.count ?? 0)
    : null
  const revenue = view.data
    ? week
      ? view.data.summary.every((d) => d.revenue !== null)
        ? view.data.summary.reduce((sum, d) => sum + (d.revenue ?? 0), 0)
        : null
      : (summary?.revenue ?? null)
    : null
  // a request's time left, counted while the business is open (a specialist reads wall time)
  const closed = business ? openMinutesBetween(business, now, now + 60_000) === 0 : false
  const timer = (until: number | null) => {
    if (until === null) return null
    const left = business ? (at: number) => openMinutesBetween(business, at, until) : undefined
    const by = closed ? fmt.time(localOf(until).min) : null
    return {
      node: (
        <TimerPill
          size="s"
          until={until}
          left={left}
          format={(m) => fmt.duration(m)}
          label={(m) => t('timer.left', { time: fmt.duration(m) })}
          by={by ? { text: t('timer.by', { time: by }), label: t('timer.byLabel', { time: by }) } : undefined}
        />
      ),
      text: by
        ? t('timer.byLabel', { time: by })
        : t('timer.left', { time: fmt.duration(Math.max(0, Math.ceil(left ? left(now) : (until - now) / 60_000))) }),
    }
  }

  return (
    <WorkspacePage title={sections('calendar')} switcherOnPhone flush>
      <div className="flex flex-none flex-col gap-2 border-b border-n-200 px-4 pt-3 pb-2.5 sm:px-6 lg:px-8">
        <CalendarToolbar
          date={date}
          today={todayDate}
          week={week}
          firstDay={firstDay}
          onDate={goDay}
          onRange={pickRange}
          columns={columns}
          people={picked}
          onPeople={pickPeople}
          specialist={specialist}
          view={view.data}
          cancelled={cancelled}
          onCancelled={(on) => go({ cancelled: on ? true : undefined })}
          requests={first ? queue.length : requests}
          onRequests={first ? () => openRequest(first) : undefined}
          onNew={() => go({ panel: 'new', booking: undefined, move: undefined }, true)}
        />
        {shownBookings !== null && (
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[18px] text-n-500">
            <span>{t.rich('bookings', { n: shownBookings, b: bold })}</span>
            {revenue !== null && (
              <>
                <span aria-hidden>{t('dot')}</span>
                <span>
                  {/* a day gone by: what it earned, no longer planned */}
                  {t.rich(specialist ? 'earnings' : 'revenue', {
                    past: (week ? addDays(firstDay, 6) : shown) < todayDate ? 'yes' : 'no',
                    amount: fmt.money(revenue),
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
        <WeekAll
          view={{ ...view.data, columns: weekColumns }}
          from={view.data.from}
          today={todayDate}
          // the person's day, one column; the head's, as many people as the week showed
          onDay={(day, staffId) => go({ date: day === todayDate ? undefined : day, view: 'dayOne', staff: staffId }, false)}
        />
      )}
      {view.data && shape === 'weekOne' && columns.find((c) => c.staffId === phoneStaff) && (
        <WeekOne
          view={view.data}
          column={columns.find((c) => c.staffId === phoneStaff)!}
          from={view.data.from}
          now={now}
          picked={search.booking}
          timer={timer}
          onDay={(day) => openDay(day, 'dayOne')}
          onOpen={(pick) =>
            'request' in pick
              ? openRequest({ code: pick.request })
              : go({ booking: search.booking === pick.booking ? undefined : pick.booking, request: undefined, move: undefined }, true)
          }
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
          only={specialist ? undefined : picked}
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
