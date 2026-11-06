import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { BOOKING_TABS, type BookingRow as Row } from '@yeral/contract/calendar'
import type { BusinessHours } from '@yeral/domain/hours'
import { localized } from '@yeral/domain/model'
import type { Level } from '@yeral/domain/permissions'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { EmptyState } from '@yeral/ui/empty-state'
import { Input } from '@yeral/ui/input'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { TabCount, Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { CalendarX2, Download, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { BookingDrawer, RequestDrawer } from '@/widgets/booking-drawer'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import { rangeOf, type BookingsSearch, type BookingsTab, type BookingsWhen } from '../model/search'
import { BookingsTable } from './bookings-table'
import { RequestsTab } from './requests-tab'

/** A filter's value for «All …», no search param. */
const ALL = 'all'

/**
 * The bookings list (B-Bookings, book B-30): the tabs Today · Upcoming · Past · Cancelled, the filters (search by client,
 * number or code; specialist; service; date), «Show more», Export CSV, the same drawers as the calendar by `?booking=`
 * and `?request=`. Everything on the page is in its address. A specialist reads their own rows.
 */
export function BookingsPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <Bookings key={workspace.slug} slug={workspace.slug} level={workspace.level} />
}

function Bookings({ slug, level }: { slug: string; level: Level }) {
  const specialist = level === 'specialist'
  const t = useTranslations('bookings')
  const sections = useTranslations('shell.sections')
  const locale = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const navigate = useNavigate()
  const search: BookingsSearch = useSearch({ strict: false })
  const tab: BookingsTab = search.tab ?? 'requests'
  const requests = tab === 'requests'
  const todayDate = today(now)
  const go = (patch: Partial<BookingsSearch>, replace = true) =>
    void navigate({ to: '.', search: (prev: BookingsSearch) => ({ ...prev, ...patch }), replace })

  // the search box writes to the address after a pause in the typing
  const [typed, setTyped] = useState(search.q ?? '')
  useEffect(() => {
    const q = typed.trim() || undefined
    if (q === search.q) return
    const timer = setTimeout(() => go({ q }), 250)
    return () => clearTimeout(timer)
  })

  const filters = {
    tab: requests ? ('today' as const) : tab,
    q: search.q,
    staff: search.staff,
    service: search.service,
    ...rangeOf(search.when, todayDate),
    lang: locale,
  }
  const list = useInfiniteQuery({ ...sdk.calendar.bookings(slug, filters), placeholderData: keepPreviousData, enabled: !requests })
  const waiting = useQuery(sdk.requests.list(slug)).data?.items.length ?? 0
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const filtered = !!(search.q || search.staff || search.service || search.when)

  // who and what the filters offer: the calendar's people, the menu
  const people = useQuery({ ...sdk.calendar.view(slug, { date: todayDate, days: 1, lang: locale }), enabled: !specialist })
  const menu = useQuery(sdk.settings.menu(slug))
  const hours = useQuery({ ...sdk.settings.hours(slug), enabled: !specialist, retry: false })
  const business: BusinessHours | null = hours.data ? { hours: hours.data.hours, exceptions: hours.data.specialDays } : null

  const toCalendar = (to: Record<string, unknown>) => void navigate({ to: '/w/$slug/calendar', params: { slug }, search: to })
  const onOpen = (r: Row) => go(r.status === 'pending' ? { request: r.code, booking: undefined } : { booking: r.code, request: undefined })
  const onMove = (r: { code: string; date: string }) => toCalendar({ move: r.code, ...(r.date === todayDate ? {} : { date: r.date }) })
  const onBookAgain = (r: { client: { id: string | null }; items: readonly { serviceId: string | null; staffId: string | null }[] }) =>
    toCalendar({
      panel: 'new',
      ...(r.client.id ? { client: r.client.id } : {}),
      services: r.items.flatMap((i) => i.serviceId ?? []).join(',') || undefined,
      staff: r.items[0]?.staffId ?? undefined,
    })
  const clear = () => {
    setTyped('')
    go({ q: undefined, staff: undefined, service: undefined, when: undefined })
  }

  if (list.isError && !list.data) throw list.error

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          size="m"
          aria-label={t('search')}
          placeholder={t('search')}
          className="w-full sm:w-72"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {!specialist && (
          <Select
            size="m"
            aria-label={t('staffFilter')}
            className="w-auto max-sm:hidden"
            value={search.staff ?? ALL}
            onValueChange={(v) => go({ staff: v === ALL ? undefined : v })}
            options={[
              { value: ALL, label: t('allStaff') },
              ...(people.data?.columns ?? []).map((c) => ({ value: c.staffId, label: c.name })),
            ]}
          />
        )}
        <Select
          size="m"
          aria-label={t('serviceFilter')}
          className="w-auto max-sm:hidden"
          value={search.service ?? ALL}
          onValueChange={(v) => go({ service: v === ALL ? undefined : v })}
          options={[
            { value: ALL, label: t('allServices') },
            ...(menu.data?.groups ?? []).map((g) => ({
              label: localized(g.name, locale),
              options: g.services.map((s) => ({ value: s.id, label: localized(s.name, locale) })),
            })),
          ]}
        />
        <Select
          size="m"
          aria-label={t('dateFilter')}
          className="w-auto max-sm:hidden"
          value={search.when ?? ALL}
          onValueChange={(v) => go({ when: v === ALL ? undefined : (v as BookingsWhen) })}
          options={[
            { value: ALL, label: t('allTime') },
            { value: 'today', label: t('dateToday') },
            { value: 'week', label: t('dateWeek') },
          ]}
        />
        {filtered && (
          <Button variant="ghost" size="s" onClick={clear}>
            {t('clear')}
          </Button>
        )}
        <span className="flex-1" />
        {!specialist && rows.length > 0 && (
          <Button asChild variant="secondary" size="s" className="max-sm:hidden">
            <a href={sdk.calendar.exportUrl(slug, filters)} download>
              <Download aria-hidden />
              {t('export')}
            </a>
          </Button>
        )}
      </div>
      {list.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label={t('loading')} />
        </div>
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX aria-hidden />}
            title={t('nothing')}
            description={t('nothingHint')}
            action={
              <Button variant="secondary" size="s" onClick={clear}>
                {t('clearFilters')}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={<CalendarX2 aria-hidden />} title={t(`empty.${filters.tab}`)} />
        )
      ) : (
        <>
          <BookingsTable
            rows={rows}
            now={now}
            specialist={specialist}
            picked={search.booking ?? search.request}
            onOpen={onOpen}
            onMove={onMove}
            onBookAgain={onBookAgain}
            onOpenClient={(r) => r.client.id && void navigate({ to: '/w/$slug/clients/$id', params: { slug, id: r.client.id } })}
          />
          {list.hasNextPage && (
            <Button variant="secondary" className="self-center" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
              {t('showMore')}
            </Button>
          )}
        </>
      )}
    </>
  )

  return (
    <WorkspacePage title={sections('bookings')}>
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={(next) => go({ tab: next === 'requests' ? undefined : (next as BookingsTab) })}>
          <TabsList aria-label={t('tabsLabel')}>
            <TabsTrigger value="requests">
              {t('tabs.requests')}
              {waiting > 0 && <TabCount>{waiting}</TabCount>}
            </TabsTrigger>
            {BOOKING_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {t(`tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="requests" className="pt-4">
            {requests && (
              <RequestsTab
                slug={slug}
                business={business}
                specialist={specialist}
                picked={search.request}
                onOpen={(code) => go({ request: code, booking: undefined })}
              />
            )}
          </TabsContent>
          {/* a panel per tab, as each tab names its own; the rows live in the one on screen */}
          {BOOKING_TABS.map((value) => (
            <TabsContent key={value} value={value} className="flex flex-col gap-4 pt-4">
              {value === tab && body}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      {search.request && (
        <RequestDrawer
          slug={slug}
          code={search.request}
          now={now}
          business={business}
          onGo={(r) => go({ request: r.code })}
          onAnswered={() => go({ request: undefined })}
          onShow={(date, staff) => toCalendar({ ...(date === todayDate ? {} : { date }), ...(staff ? { staff } : {}) })}
          onClose={() => go({ request: undefined })}
        />
      )}
      {search.booking && !search.request && (
        <BookingDrawer
          slug={slug}
          code={search.booking}
          now={now}
          level={level}
          onMove={onMove}
          onBookAgain={onBookAgain}
          onClose={() => go({ booking: undefined })}
        />
      )}
    </WorkspacePage>
  )
}
