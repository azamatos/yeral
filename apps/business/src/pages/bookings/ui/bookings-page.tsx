import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { BOOKING_SORTS, BOOKING_TABS, type BookingRow as Row, type BookingSort } from '@yeral/contract/calendar'
import type { BusinessHours } from '@yeral/domain/hours'
import { localized, type BookingStatus } from '@yeral/domain/model'
import type { Level } from '@yeral/domain/permissions'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { EmptyState } from '@yeral/ui/empty-state'
import { FilterBar, type FilterBarLabels, type FilterDef } from '@yeral/ui/filter-bar'
import { Spinner } from '@yeral/ui/spinner'
import { TabCount, Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { CalendarX2, Download, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { BookingDrawer, RequestDrawer } from '@/widgets/booking-drawer'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import { joined, listOf, rangeOf, TAB_STATUSES, type BookingsSearch, type BookingsTab, type BookingsWhen } from '../model/search'
import { BookingsTable } from './bookings-table'
import { RequestsTab } from './requests-tab'

/**
 * The bookings list (B-Bookings, book B-30; design v0.7 B8): the tabs Today · Upcoming · Past · Cancelled, the filters (search by client,
 * number or code; specialists; services; statuses; date), the order, «24 of 214 bookings», «Show more», Export CSV, the
 * same drawers as the calendar by `?booking=` and `?request=`. Everything on the page is in its address. A specialist
 * reads their own rows.
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

  const listTab = requests ? ('today' as const) : tab
  // a status another tab can't hold (an old link, a tab switched by hand) filters nothing here
  const statuses = listOf(search.status).filter((s): s is BookingStatus => TAB_STATUSES[listTab].includes(s as BookingStatus))
  const query = {
    tab: listTab,
    q: search.q,
    staff: listOf(search.staff),
    service: listOf(search.service),
    status: statuses,
    sort: search.sortBy,
    ...rangeOf(search.when, todayDate),
    lang: locale,
  }
  const list = useInfiniteQuery({ ...sdk.calendar.bookings(slug, query), placeholderData: keepPreviousData, enabled: !requests })
  const waiting = useQuery(sdk.requests.list(slug)).data?.items.length ?? 0
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const filtered = !!(search.q || search.staff || search.service || statuses.length || search.when)
  const counted = list.data?.pages[0]
  const f = useTranslations('bookings.filters')
  const st = useTranslations('status')
  const labels: FilterBarLabels = {
    filters: f('filters'),
    clearAll: f('clearAll'),
    clear: t('clear'),
    close: f('close'),
    back: f('back'),
    showResults: f('showResults'),
    searchIn: f('searchIn'),
    remove: (chip) => f('remove', { chip }),
    nothingMatches: (q) => f('nothingMatches', { q }),
  }

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
    go({ q: undefined, staff: undefined, service: undefined, status: undefined, when: undefined })
  }

  if (list.isError && !list.data) throw list.error

  // the bar's menus (DS-Lists A5): specialists, services (grouped, searchable) and statuses take several each
  const filters: FilterDef[] = [
    ...(specialist
      ? []
      : [
          {
            id: 'staff',
            label: t('staffFilter'),
            multiple: true as const,
            value: query.staff,
            onValueChange: (v: string[]) => go({ staff: joined(v) }),
            options: (people.data?.columns ?? []).map((c) => ({ value: c.staffId, label: c.name })),
          },
        ]),
    {
      id: 'service',
      label: t('serviceFilter'),
      multiple: true,
      value: query.service,
      onValueChange: (v) => go({ service: joined(v) }),
      options: (menu.data?.groups ?? []).map((g) => ({
        label: localized(g.name, locale),
        options: g.services.map((s) => ({ value: s.id, label: localized(s.name, locale) })),
      })),
    },
    ...(TAB_STATUSES[listTab].length
      ? [
          {
            id: 'status',
            label: t('statusFilter'),
            multiple: true as const,
            value: statuses,
            onValueChange: (v: string[]) => go({ status: joined(v) }),
            options: TAB_STATUSES[listTab].map((value) => ({ value, label: st(value) })),
          },
        ]
      : []),
    {
      id: 'when',
      label: t('dateFilter'),
      anyLabel: t('allTime'),
      value: search.when ?? null,
      onValueChange: (v) => go({ when: (v as BookingsWhen | null) ?? undefined }),
      options: (['today', 'tomorrow', 'week'] as const).map((value) => ({ value, label: t(`date.${value}`) })),
    },
  ]

  const body = (
    <>
      <FilterBar
        labels={labels}
        search={{ value: typed, onChange: setTyped, placeholder: t('search') }}
        filters={filters}
        onClearAll={clear}
        sort={{
          label: t('sort'),
          value: search.sortBy ?? (listTab === 'today' || listTab === 'upcoming' ? 'soonest' : 'latest'),
          options: BOOKING_SORTS.map((value) => ({ value, label: t(`sorts.${value}`) })),
          onValueChange: (v) => go({ sortBy: v as BookingSort }),
        }}
        count={counted && (filtered ? f('of', { n: counted.total, total: counted.tabTotal }) : f('count', { n: counted.total }))}
        action={
          !specialist &&
          rows.length > 0 && (
            <Button asChild variant="secondary" size="m" className="max-sm:hidden">
              <a href={sdk.calendar.exportUrl(slug, query)} download>
                <Download aria-hidden />
                {t('export')}
              </a>
            </Button>
          )
        }
      />
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
              <Button variant="tertiary" size="s" onClick={clear}>
                {t('clearFilters')}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={<CalendarX2 aria-hidden />} title={t(`empty.${query.tab}`)} />
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
        <Tabs value={tab} onValueChange={(next) => go({ tab: next === 'requests' ? undefined : (next as BookingsTab), status: undefined })}>
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
