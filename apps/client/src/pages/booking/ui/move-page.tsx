import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { BookingDetail } from '@yeral/contract/bookings'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { ActionBar } from '@yeral/ui/action-bar'
import { Logo } from '@yeral/ui/brand'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { useClock } from '@yeral/ui/clock'
import { KeyValueList } from '@yeral/ui/key-value'
import { Price } from '@yeral/ui/price'
import { Skeleton } from '@yeral/ui/skeleton'
import { Stepper } from '@yeral/ui/stepper'
import { toast } from '@yeral/ui/toast'
import { ArrowRight, CalendarPlus, Check, ChevronLeft, CircleAlert, Clock, Lock, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { pickedServices, selectionTotal } from '@/features/pick-services'
import { BookingStatusBadge, whatParts } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { addressLine, calendarAt } from '@/shared/lib'
import { wrap } from '@/shared/ui'
import { chosenStaff, currentMoveStep, isOwnTime, MOVE_STEPS, moveRefusal, wasOf, type BookingSearch, type MoveStep } from '../model/flow'
import { useAddToCalendar } from './add-to-calendar'
import { FocusedHeader } from './focused-header'
import { Rules } from './rules'
import { StaffStep } from './staff-step'
import { StepTitle } from './step-title'
import { Summary } from './summary'
import { TimeStep } from './time-step'

type Picked = ReturnType<typeof pickedServices>

/** A time as the move writes it: «Thursday, 15 October · 14:30–15:30» (a start past midnight on the next date). */
function useWhenLong() {
  const t = useTranslations('booking')
  const fmt = useFmt()
  return (date: string, start: number, end: number) =>
    t('summary.when', { date: fmt.weekdayDate(calendarAt(date, start).date), range: fmt.timeRange(start, end) })
}

/**
 * The previous and the new time side by side (Booking `.mv`, stacked on phones): the previous one quiet while it still
 * stands (`.mvo`), struck through once it's gone (`.mvo.gone`, the time changed). `flat` is the sent card's row.
 */
function OldNew({ before, after, gone = false, flat = false }: { before: string; after: string; gone?: boolean; flat?: boolean }) {
  const m = useTranslations('booking.move')
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-6 py-5 max-sm:grid-cols-1 max-sm:gap-2.5 max-sm:px-5 max-sm:py-4 ${
        flat ? 'border-b border-n-200' : 'rounded-card border border-n-200 bg-n-0'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-label text-n-500 uppercase">{m('old')}</span>
        <span className={`text-[17px] leading-6 font-semibold ${gone ? 'text-n-500 line-through' : 'text-n-600'}`}>{before}</span>
      </div>
      <ArrowRight aria-hidden className="size-6 text-n-500 max-sm:rotate-90" strokeWidth={1.75} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-label text-n-500 uppercase">{m('new')}</span>
        <span className="text-[17px] leading-6 font-bold text-n-900">{after}</span>
      </div>
    </div>
  )
}

/** The services as booked, locked (Booking `.lockb`): name, minutes and price, and the way to change them. */
function Locked({ picked }: { picked: Picked }) {
  const m = useTranslations('booking.move')
  const fmt = useFmt()
  return (
    <div className="flex flex-col gap-2.5 rounded-m bg-n-50 p-4">
      {picked.map((s) => (
        <div key={s.id} className="flex items-start gap-2.5">
          <Lock aria-hidden className="mt-0.5 size-4 flex-none text-n-600" strokeWidth={1.75} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] leading-5 font-semibold">{s.name}</span>
            <span className="text-dense text-n-600">{fmt.duration(s.durationMin)}</span>
          </span>
          <Price hidden={s.price.type === 'hidden'}>{fmt.price(s.price)}</Price>
        </div>
      ))}
      <span className="text-dense text-n-600">{m('locked')}</span>
    </div>
  )
}

/**
 * `/{lang}/b/{slug}/book?move={code}` — move mode (Booking `mode=move`, book C-30): «Change the time» with the booking's
 * code, the steps Specialist · Time · Confirm (the services as booked, locked, with the way to change them), the one
 * it's with now chosen and marked «Current», the new time among theirs (the booking's own time out of the choice with
 * them), then «Confirm the new time» with the previous and the new time. A business that confirms by hand gets
 * «Request the new time» (the previous time is kept until it answers), one that confirms at once «Change the time»;
 * the business's rules under it. A time taken meanwhile says so and the time step reads its times again; any other
 * refusal reads the booking again (what it is now decides). Sent, the page says which from its address
 * (`?moved=asked|changed`, the times with it), so a reload keeps it whatever happens next. The free times come from
 * the booking's own services (the api's, `2026-10-30-move-own-services.md`): a booking that can't move here (not a
 * confirmed appointment, past its free change time, or `not_bookable` from the first free-times read: a service of it
 * gone from the menu) says so with the way back to My bookings, before the time step; the booking's specialist no
 * longer doing its services (`not_found` naming them) makes it «Any specialist». Signed out, the way to log in.
 */
export function MovePage() {
  const t = useTranslations('booking')
  const m = useTranslations('booking.move')
  const failed = useTranslations('failed')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const now = useClock()
  const errorText = useErrorText()
  const at = useWhenLong()
  const location = useLocation()
  const { slug = '' } = useParams({ strict: false })
  const search: BookingSearch = useSearch({ strict: false })
  const navigate = useNavigate()
  const code = search.move ?? ''
  const { data: detail } = useSuspenseQuery(sdk.catalog.business(slug, lang))
  const booking = useQuery(sdk.bookings.detail(code, lang))
  const send = useMutation(sdk.bookings.reschedule(lang))
  const b = booking.data
  const back = { to: '/$lang/account/bookings/$code' as const, params: { lang, code } }

  const items = b?.what.type === 'appointment' ? b.what.items : []
  // the services as booked, for their names and prices (the api reads the free times from the booking's own items)
  const ids = items.flatMap((i) => (i.serviceId ? [i.serviceId] : []))
  const picked = pickedServices(detail, ids)
  const total = selectionTotal(picked)
  const people = [...new Set(items.map((i) => i.staffId))]
  const current = people.length === 1 ? (people[0] ?? null) : null
  const asked = search.staff ?? current ?? 'any'
  // one no longer on the page, or no longer doing the services, leaves anyone (the api never swaps them)
  const staff = chosenStaff(detail, ids, asked)
  const staffName = detail.specialists.find((s) => s.id === staff)?.name ?? t('staff.any')
  const own = b ? { code, date: b.date, start: b.start, current } : null
  const date = search.date && search.date >= today(now) ? search.date : null
  const locked = send.isPending || send.isSuccess
  // what the booking says of its move; the api's first free-times read has the last word
  const movableAsRead =
    b !== undefined && b.business.slug === detail.slug && b.what.type === 'appointment' && b.status === 'confirmed' && b.actions.reschedule
  // the first free-times read (the time step's own, without a day) says before the time step whether the booking can
  // still move online, and whether its specialist still does its services; the page waits for it only while the
  // address names nobody (its first open): a specialist chosen later keeps the step while their times come
  const first = useQuery({
    ...sdk.availability.appointment(detail.slug, { lang, staff, move: code }),
    enabled: movableAsRead && !search.moved,
  })
  const gating = first.isPending && search.staff === undefined
  const refusal = moveRefusal(first.error, staff) ?? moveRefusal(send.error, staff)
  // the specialist asked for is gone: the page's catalogue says so (with every service still known: a service gone for
  // good is the api's `not_bookable`, not theirs), or the api's 404 when the page is behind it
  const staffGone = b !== undefined && ((asked !== 'any' && staff === 'any' && ids.length === items.length) || refusal === 'staff_gone')
  const askedName = detail.specialists.find((s) => s.id === asked)?.name ?? items.find((i) => i.staffId === asked)?.staff ?? null
  useEffect(() => {
    if (!staffGone) return
    if (askedName) toast(m('staffGone', { name: askedName }))
    void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, staff: 'any', time: undefined }), replace: true })
  }, [staffGone, askedName, navigate, m])
  // any other refusal of the first read (cancelled meanwhile, its free change time over): what the booking is now decides
  const stale = first.error !== null && !refusal && isApiError(first.error) && first.error.code !== 'network'
  useEffect(() => {
    if (stale) void queryClient.invalidateQueries({ queryKey: sdk.bookings.detail(code, lang).queryKey })
  }, [stale, queryClient, sdk, code, lang])
  // the chosen day's free times, as the time step asks them: a time the day no longer has isn't chosen any more
  const freeTimes = sdk.availability.appointment(detail.slug, { lang, staff, date: date ?? undefined, move: code })
  const free = useQuery({ ...freeTimes, enabled: date !== null && search.time !== undefined && !search.moved })
  const settled = free.data && !free.isPlaceholderData ? free.data : null
  const chosen = search.time
  const time =
    date !== null &&
    chosen !== undefined &&
    // while it sends, the time stays put (an instant move makes it the booking's own)
    (locked || ((!own || !isOwnTime(own, staff, date, chosen)) && (!settled || settled.slots.some((s) => s.start === chosen))))
      ? chosen
      : null

  const header = (start: ReactNode, middle?: ReactNode) => (
    <FocusedHeader
      start={start}
      middle={middle}
      end={
        <Button asChild variant="ghost" iconOnly aria-label={t('close')}>
          <Link {...back}>
            <X aria-hidden className="size-[22px]" />
          </Link>
        </Button>
      }
    />
  )
  const backLink = (
    <Button asChild variant="ghost" className="-ml-2.5 min-w-0 pr-4 pl-2.5">
      <Link {...back}>
        <ChevronLeft aria-hidden />
        {t('back')}
      </Link>
    </Button>
  )

  if (search.moved && b) return <MoveSent booking={b} detail={detail} picked={picked} staffName={staffName} />

  const movable = movableAsRead && refusal !== 'not_bookable'
  if (!b || !movable || gating) {
    const signedOut = isApiError(booking.error, 'unauthorized')
    const missing = isApiError(booking.error, 'not_found') || isApiError(booking.error, 'validation_error')
    return (
      <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
        {header(backLink)}
        <main className="mx-auto w-full max-w-160 px-6 pt-14 pb-24 max-sm:px-4 max-sm:pt-10">
          {booking.isPending || (movable && gating) ? (
            <div aria-hidden className="flex flex-col gap-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : signedOut ? (
            <Callout
              layout="card"
              icon={<CircleAlert />}
              title={m('logIn')}
              actions={
                <Button asChild size="s" variant="primary">
                  <Link to="/$lang/login" params={{ lang }} search={{ redirect: location.href }}>
                    {m('logInAction')}
                  </Link>
                </Button>
              }
            >
              {m('logInLead')}
            </Callout>
          ) : booking.isError && !missing ? (
            <Callout
              tone="danger"
              icon={<CircleAlert />}
              action={
                <Button size="s" variant="secondary" onClick={() => void booking.refetch()}>
                  {failed('action')}
                </Button>
              }
            >
              {errorText(booking.error)}
            </Callout>
          ) : (
            <Callout
              layout="card"
              icon={<CircleAlert />}
              title={m('cant')}
              actions={
                <Button asChild size="s" variant="secondary">
                  <Link to="/$lang/account/bookings" params={{ lang }}>
                    {m('myBookings')}
                  </Link>
                </Button>
              }
            >
              {refusal === 'not_bookable' ? m('cantServiceLead') : m('cantLead')}
            </Callout>
          )}
        </main>
      </div>
    )
  }

  const step: MoveStep = locked ? 'confirm' : currentMoveStep(search.step, time !== null)
  const index = MOVE_STEPS.indexOf(step)
  const done = locked || step === 'staff' || time !== null
  const instant = detail.confirmMode === 'instant'
  const before = at(b.date, b.start, b.end)
  const after = date !== null && time !== null ? at(date, time, time + total.minutes) : null

  const set = (patch: Partial<BookingSearch>, { newEntry = false, top = false } = {}) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, step, ...patch }),
      replace: !newEntry,
      resetScroll: top,
    })
  const go = (to: MoveStep, newEntry: boolean) => set({ step: to }, { newEntry, top: true })
  const next = () => {
    const to = MOVE_STEPS[index + 1]
    if (done && !locked && to) go(to, true)
  }
  const submit = () => {
    if (locked || date === null || time === null) return
    send.mutate(
      { code, body: { date, start: time, staffId: staff === 'any' ? null : staff } },
      {
        onSuccess: (moved) =>
          void navigate({
            to: '.',
            // what was sent stays in the address: the sent page doesn't guess it from what the booking is later
            search: { move: code, moved: moved.reschedule ? 'asked' : 'changed', date, time, staff, was: `${b.date}@${b.start}` },
            replace: true,
            resetScroll: true,
          }),
        onError: (error) => {
          if (isApiError(error, 'slot_taken')) {
            // the time step asks its times again when it opens, without the one just taken
            void queryClient.invalidateQueries({ queryKey: freeTimes.queryKey, refetchType: 'none' })
            toast(m('taken'))
            set({ step: 'time', time: undefined }, { top: true })
            return
          }
          // the specialist no longer doing the services, or a service gone: the page says so from `refusal`
          if (moveRefusal(error, staff)) return
          // cancelled meanwhile, its free change time over: what the booking is now decides
          void queryClient.invalidateQueries({ queryKey: sdk.bookings.detail(code, lang).queryKey })
          toast(errorText(error))
        },
      },
    )
  }
  const cta =
    step === 'confirm' ? (
      <Button size="l" variant="primary" className="w-full" disabled={!done} loading={send.isPending} onClick={submit}>
        {instant ? m('change') : m('ask')}
      </Button>
    ) : (
      <Button size="l" variant="primary" className="w-full" disabled={!done} onClick={next}>
        {t('summary.continue')}
      </Button>
    )
  const hint = !done ? t('summary.pickTime') : step === 'confirm' && !instant ? m('keeps') : null
  const summary = (withCta: boolean) => (
    <Summary
      detail={detail}
      picked={picked}
      total={total}
      staffName={staffName}
      date={date}
      time={time}
      cta={withCta ? cta : null}
      hint={withCta ? hint : null}
      move={{ before }}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
      {header(
        index === 0 ? (
          backLink
        ) : (
          <Button variant="ghost" className="-ml-2.5 min-w-0 pr-4 pl-2.5" onClick={() => go(MOVE_STEPS[index - 1] ?? 'staff', false)}>
            <ChevronLeft aria-hidden />
            {t('back')}
          </Button>
        ),
        <Stepper
          aria-label={t('stepsLabel')}
          steps={MOVE_STEPS.map((s) => m(`steps.${s}`))}
          current={index}
          reached={time !== null ? 2 : 1}
          onStepClick={(i) => go(MOVE_STEPS[i] ?? 'staff', false)}
          className="self-stretch"
        />,
      )}
      <div className={`${wrap} flex-1`}>
        <div className="flex flex-wrap items-start gap-10 pt-10 pb-24 max-md:pb-10 max-sm:pt-6">
          <main className="min-w-0 flex-[999_1_560px]">
            <div className="flex max-w-180 flex-col">
              <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.025em] max-sm:text-[24px] max-sm:leading-[30px]">
                  {m('title')}
                </h1>
                <span className="inline-flex h-6.5 items-center rounded-pill border border-n-200 bg-group px-2.5 text-dense font-semibold text-st-cancelled-ink tabular-nums">
                  {code}
                </span>
              </div>
              {step === 'staff' && (
                <div className="flex flex-col gap-6">
                  <Locked picked={picked} />
                  <StaffStep
                    detail={detail}
                    serviceIds={ids}
                    staff={staff}
                    move={{ code, current }}
                    onPick={(id) => id !== staff && set({ staff: id, time: undefined })}
                  />
                </div>
              )}
              {step === 'time' && own && (
                <TimeStep
                  slug={detail.slug}
                  serviceIds={ids}
                  minutes={total.minutes}
                  staff={staff}
                  staffName={staffName}
                  date={date}
                  time={time}
                  move={own}
                  onDate={(day) => set({ date: day, time: undefined })}
                  onTime={(start, day) => set({ date: day, time: start })}
                />
              )}
              {step === 'confirm' && after && (
                <div className="flex flex-col gap-6">
                  <StepTitle
                    title={m('confirmTitle')}
                    lead={m('confirmLead', { duration: fmt.duration(total.minutes), staff: staffName })}
                    level={2}
                  />
                  <OldNew before={before} after={after} />
                  {!instant && (
                    <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900 md:hidden">
                      <Clock aria-hidden className="mt-px size-4.5 flex-none text-st-pending-ink" strokeWidth={2} />
                      {m('keeps')}
                    </p>
                  )}
                  {/* under 1024 the summary isn't beside the steps: the booking's card is here */}
                  <div className="md:hidden">{summary(false)}</div>
                  {/* the move changes nothing about the payment: its board leaves «Pay at the place» out */}
                  <Rules rules={detail.rules} pay={false} className="pb-0" />
                </div>
              )}
            </div>
          </main>
          <aside aria-label={t('summaryLabel')} className="sticky top-6 min-w-0 flex-[1_1_340px] max-md:hidden">
            {summary(true)}
          </aside>
        </div>
      </div>
      <ActionBar className="md:hidden" aria-label={t('summaryLabel')} role="region" action={cta}>
        <span className="truncate text-body font-semibold">{after ? m('after', { when: after }) : m('before', { when: before })}</span>
        <span className="truncate text-dense text-n-600">
          {hint ?? (after ? m('before', { when: before }) : `${staffName} · ${fmt.price(total.price)}`)}
        </span>
      </ActionBar>
    </div>
  )
}

/**
 * The move's sent page (Booking `isSentMove`), from its address: asked of a business that confirms by hand, «Move
 * request sent» with the new time waiting and the previous one kept; changed at once, «Time changed» with the previous
 * one struck through and «Add to calendar» with the new time (as the board draws it for the instant move only: an
 * asked time isn't fixed yet). The booking stays confirmed either way; the card has the business, the times, what and
 * where.
 */
function MoveSent({
  booking: b,
  detail,
  picked,
  staffName,
}: {
  booking: BookingDetail
  detail: BusinessDetail
  picked: Picked
  staffName: string
}) {
  const m = useTranslations('booking.move')
  const t = useTranslations('booking')
  const words = useTranslations()
  const brand = words('common.brand')
  const fmt = useFmt()
  const lang = useLocale()
  const at = useWhenLong()
  const search: BookingSearch = useSearch({ strict: false })
  const calendar = useAddToCalendar()
  const minutes = b.end - b.start
  const was = wasOf(search.was)
  const asked = search.moved === 'asked'
  // the new time as sent; the booking's own when the address lost it
  const moved = search.date && search.time !== undefined ? { date: search.date, start: search.time } : { date: b.date, start: b.start }
  const after = at(moved.date, moved.start, moved.start + minutes)
  const before = was ? at(was.date, was.start, was.start + minutes) : null
  // the time changed at once is fixed: it goes to the calendar as a sent booking does (an asked one isn't yet)
  const addToCalendar = () =>
    calendar.add({
      code: b.code,
      date: moved.date,
      start: moved.start,
      end: moved.start + minutes,
      services: whatParts(b.what)[0] ?? '',
      business: detail.name,
      address: addressLine(detail, fmt),
    })
  return (
    <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
      <FocusedHeader
        start={
          <Link to="/$lang" params={{ lang }} aria-label={words('site.home', { brand })} className="flex">
            <Logo alt={brand} height={28} />
          </Link>
        }
        end={
          <Button asChild variant="ghost" iconOnly aria-label={t('close')}>
            <Link to="/$lang/account/bookings/$code" params={{ lang, code: b.code }}>
              <X aria-hidden className="size-[22px]" />
            </Link>
          </Button>
        }
      />
      <main className="mx-auto flex w-full max-w-160 flex-col gap-8 px-6 pt-14 pb-24 max-sm:px-4 max-sm:pt-10 max-sm:pb-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <span aria-hidden className="flex size-16 items-center justify-center rounded-pill bg-a-50 text-a-500">
            {asked ? <Clock className="size-7" strokeWidth={1.75} /> : <Check className="size-7" strokeWidth={2} />}
          </span>
          <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.025em] text-balance">
            {asked ? m('sentTitle') : m('movedTitle')}
          </h1>
          <BookingStatusBadge status="confirmed" />
          {asked && (
            <>
              <span className="inline-flex items-start gap-2 text-left text-[15px] leading-[22px] font-medium">
                <Clock aria-hidden className="mt-0.75 size-4 flex-none text-st-pending-ink" strokeWidth={2} />
                {m('waiting', { when: after })}
              </span>
              <p className="m-0 max-w-115 text-body text-n-600">{m('keeps')}</p>
            </>
          )}
        </div>
        <div className="flex flex-col overflow-hidden rounded-card border border-n-200">
          <div className="flex items-center gap-3.5 border-b border-n-200 px-6 py-5 max-sm:px-5">
            {detail.photos[0] && <img src={detail.photos[0].url} alt="" className="block size-12 flex-none rounded-s object-cover" />}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[16px] leading-[22px] font-semibold">{detail.name}</span>
              <span className="text-dense text-n-600">{detail.category.name}</span>
            </div>
          </div>
          {before && <OldNew before={before} after={after} gone={!asked} flat />}
          <KeyValueList
            className="px-6 py-4 max-sm:px-5"
            items={[
              {
                key: t('sent.services', { count: picked.length }),
                value: picked.map((s) => t('sent.serviceLine', { service: s.name, duration: fmt.duration(s.durationMin) })).join(', '),
              },
              { key: t('sent.specialist'), value: staffName },
              { key: t('sent.address'), value: addressLine(detail, fmt) },
              { key: words('bookingDrawer.code'), value: <span className="tabular-nums">{b.code}</span> },
            ]}
          />
        </div>
        <div className="flex flex-col items-center gap-3.5">
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="l">
              <Link to="/$lang/account/bookings/$code" params={{ lang, code: b.code }}>
                {m('myBookings')}
              </Link>
            </Button>
            {!asked && (
              <Button variant="secondary" size="l" onClick={addToCalendar}>
                <CalendarPlus aria-hidden />
                {calendar.label}
              </Button>
            )}
            <Button asChild variant="ghost" size="l">
              <Link to="/$lang" params={{ lang }}>
                {t('sent.home')}
              </Link>
            </Button>
          </div>
          {calendar.done && (
            <span role="status" className="text-dense text-n-600">
              {calendar.doneText}
            </span>
          )}
        </div>
      </main>
    </div>
  )
}
