import { useInfiniteQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { EmptyState } from '@yeral/ui/empty-state'
import { Skeleton } from '@yeral/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { CalendarX2, CircleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingRow } from './booking-row'

export type BookingsTab = 'upcoming' | 'past'

/**
 * `/{lang}/account/bookings` — My bookings (Account-Bookings, book C-23–C-26, C-40): the tabs Upcoming and Past (in
 * the address, `?tab=past`), the bookings 12 at a time with «Show more», and each tab's empty state. Upcoming puts the
 * declined or expired requests that still have a time to take on top, then the rest soonest first; Past is newest
 * first (the api's order). Changes made elsewhere (the business answers, a request runs out) come in through the live
 * updates the site starts in the browser.
 */
export function MyBookingsPage() {
  const t = useTranslations('myBookings')
  const failed = useTranslations('failed')
  const lang = useLocale()
  const sdk = useSdk()
  const search: { tab?: BookingsTab } = useSearch({ strict: false })
  const navigate = useNavigate()
  const tab = search.tab ?? 'upcoming'
  const list = useInfiniteQuery(sdk.bookings.list(tab, lang))
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const panel = (
    <>
      {list.isError && !list.data ? (
        <Callout
          tone="danger"
          icon={<CircleAlert />}
          className="mt-6"
          action={
            <Button size="s" variant="secondary" onClick={() => void list.refetch()}>
              {failed('action')}
            </Button>
          }
        >
          {t('loadFailed')}
        </Callout>
      ) : !list.data ? (
        <div className="flex flex-col gap-4 pt-5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-5">
              <Skeleton className="size-24 rounded-m" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          bordered
          className="mt-6"
          icon={<CalendarX2 />}
          title={tab === 'past' ? t('emptyPast') : t('emptyUpcoming')}
          description={tab === 'past' ? t('emptyPastLead') : t('emptyUpcomingLead')}
          action={
            tab === 'upcoming' ? (
              <Button asChild variant="primary">
                <Link to="/$lang" params={{ lang }}>
                  {t('find')}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="m-0 -mx-4 flex list-none flex-col p-0 max-sm:mx-0">
            {rows.map((b) => (
              <li key={b.code} className="border-b border-n-200 last:border-b-0 max-sm:border-b">
                <BookingRow booking={b} />
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <div className="pt-6">
              <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {t('more')}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
  return (
    <>
      <h1 className="m-0 text-h2 max-sm:text-[26px] max-sm:leading-8">{t('title')}</h1>
      <Tabs
        value={tab}
        onValueChange={(v) => void navigate({ to: '.', search: { tab: v === 'past' ? 'past' : undefined }, replace: true })}
        className="mt-5"
      >
        <TabsList aria-label={t('label')}>
          <TabsTrigger value="upcoming">{t('upcoming')}</TabsTrigger>
          <TabsTrigger value="past">{t('past')}</TabsTrigger>
        </TabsList>
        {/* both panels stay in the page (each tab names its own), the one not chosen hidden and empty */}
        {(['upcoming', 'past'] as const).map((value) => (
          <TabsContent key={value} value={value} forceMount className="flex flex-col pt-2 data-[state=inactive]:hidden">
            {value === tab && panel}
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
