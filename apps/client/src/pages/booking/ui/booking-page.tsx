import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { slotTakenDetailsSchema } from '@yeral/contract/errors'
import { dow, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { ActionBar } from '@yeral/ui/action-bar'
import { Logo } from '@yeral/ui/brand'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { Stepper } from '@yeral/ui/stepper'
import { toast } from '@yeral/ui/toast'
import { ChevronLeft, X } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { ChangedNotice } from '@/entities/business'
import { calendarAt } from '@/shared/lib'
import { parseServiceIds, pickedServices, selectionTotal, serviceIdsParam, SERVICES_MAX, toggleService } from '../model/selection'
import { useErrorText } from '@/shared/i18n'
import { TermsNote, wrap } from '@/shared/ui'
import {
  chosenStaff,
  currentStep,
  reachedStep,
  servicesOf,
  stepAfterPick,
  stepDone,
  stepHasAction,
  stepsOf,
  type BookingSearch,
  type Choice,
  type Step,
} from '../model/flow'
import { AddService } from './add-service'
import { ConfirmStep, type Alternative } from './confirm-step'
import { FocusedHeader } from './focused-header'
import { SentView } from './sent-view'
import { ServicesStep } from './services-step'
import { StaffStep } from './staff-step'
import { Summary } from './summary'
import { SummarySheet } from './summary-sheet'
import { TimeStep } from './time-step'

/**
 * `/{lang}/b/{slug}/book` — the appointment booking flow (Booking, book C-12–C-22): the focused header (Back, the steps,
 * Close back to the page), one step at a time with the booking's summary beside it from 1024 and the action bar under
 * it, then the sent page. Everything chosen lives in the address (`?services=&staff=&date=&time=&step=`, `?sent=`):
 * Continue is a new history entry (the browser's Back walks the steps), a pick and the header's Back replace it. A date
 * already past and a time the day no longer has count as not chosen. A second service comes from the summary's «Add a
 * service» (C7-Booking C4.4): the chosen time stays while it still fits the new total, else the summary says so and
 * the time step shows what fits. Sending needs someone signed in with a name (the number is confirmed in place on the
 * confirmation); a time taken meanwhile offers the nearest free ones. Under 1024 the bar opens the summary as a sheet.
 */
export function BookingPage() {
  const { slug = '' } = useParams({ strict: false })
  const lang = useLocale()
  const sdk = useSdk()
  const t = useTranslations('booking')
  const words = useTranslations()
  const brand = words('common.brand')
  const fmt = useFmt()
  const errorText = useErrorText()
  const now = useClock()
  const { data: detail } = useSuspenseQuery(sdk.catalog.business(slug, lang))
  const me = useQuery(sdk.me.get())
  const search: BookingSearch = useSearch({ strict: false })
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()
  // a time someone else took just before this send, with the nearest free ones (`slot_taken`)
  const [conflict, setConflict] = useState<{ date: string; time: number; alternatives: Alternative[] } | null>(null)
  // the phone's summary sheet (the bar's left part opens it)
  const [sheet, setSheet] = useState(false)
  // a service was just added: a chosen time the new total no longer fits is said so, not dropped silently
  const [added, setAdded] = useState(false)
  const picked = pickedServices(detail, parseServiceIds(search.services))
  const ids = picked.map((s) => s.id)
  const staff = chosenStaff(detail, ids, search.staff)
  // an old link's day already gone counts as none: the time step opens on today
  const date = search.date && search.date >= today(now) ? search.date : null
  // the chosen day's free times (the time step asks the same): a time it no longer has isn't chosen any more
  const freeTimes = sdk.availability.appointment(detail.slug, { lang, services: ids, staff, date: date ?? undefined })
  const free = useQuery({ ...freeTimes, enabled: ids.length > 0 && date !== null && search.time !== undefined && !search.sent })
  const settled = free.data && !free.isPlaceholderData ? free.data : null
  const time =
    date !== null && search.time !== undefined && (!settled || settled.slots.some((s) => s.start === search.time)) ? search.time : null
  // the chosen start the day's free times no longer hold right after a service was added (C4.4 state 4)
  const stale = added && date !== null && search.time !== undefined && settled !== null && time === null ? search.time : null
  const choice: Choice = { services: ids, date, time }
  const send = useMutation(sdk.bookings.create(lang))
  // while it sends and once it's sent the confirmation stays put: the sdk refreshes the free times (the booked one goes)
  // before the page moves on to the sent page, and nothing can be sent twice
  const locked = send.isPending || send.isSuccess
  // from a specialist's «Book» they come first, done (`stepsOf`)
  const steps = stepsOf(search.first)
  const step = locked ? 'confirm' : currentStep(search.step, choice, steps)
  const index = steps.indexOf(step)
  const signedIn = Boolean(me.data?.firstName)
  // what changed since the client's last visit here (book F-245): a new address waits for its tick before sending
  const changed = signedIn ? detail.changedSinceLastVisit : null
  const [seen, setSeen] = useState(false)
  const mustTick = step === 'confirm' && Boolean(changed?.address) && !seen
  // the alert speaks for the time it was about: one chosen since (an offered one, another step) leaves it behind
  const taken = conflict && conflict.date === date && conflict.time === search.time ? conflict : null
  const done = !locked && !taken && stepDone(step, choice, steps) && (step !== 'confirm' || (signedIn && !mustTick))
  const total = selectionTotal(picked)
  const named = staff === 'any' ? null : (detail.specialists.find((s) => s.id === staff) ?? null)
  const staffName = named?.name ?? t('staff.any')
  // the business page keeps nothing picked (Venue v0.7 · C3): Back and Close leave the choice behind
  const pageLink = { to: '/$lang/b/$slug' as const, params: { lang, slug: detail.slug } }

  // the step shown goes along with every change, so a link held back to an earlier step stays on it
  const set = (patch: Partial<BookingSearch>, { newEntry = false, top = false } = {}) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, step, ...patch }),
      replace: !newEntry,
      // a new step starts at its top (client spec); a pick inside a step keeps the page where it is
      resetScroll: top,
    })
  const go = (to: Step, newEntry: boolean) => {
    setSheet(false)
    set({ step: to }, { newEntry, top: true })
  }
  // a service or a specialist picked moves straight on (C7-Booking C4.1, #39): one new history entry, so the
  // browser's Back returns to the pick
  const moveOn = (from: 'services' | 'staff', patch: Partial<BookingSearch>, answered: { services: boolean; staff: boolean }) =>
    set({ ...patch, step: stepAfterPick(from, steps, answered) }, { newEntry: true, top: true })
  const pickServices = (id: string) => {
    const next = toggleService(ids, id)
    if (next.length > SERVICES_MAX) {
      toast(t('services.max', { max: SERVICES_MAX }))
      return
    }
    // the chosen time stays while it still fits (`stale` says when it doesn't); the chosen specialist stays in the
    // address even when it rules them out (`chosenStaff` answers «any» meanwhile), so taking it off brings them back
    const patch = { services: serviceIdsParam(next) }
    setAdded(next.length > ids.length)
    if (next.length > ids.length) moveOn('services', patch, { services: true, staff: search.staff !== undefined })
    else set(patch)
  }
  // «Add a service» from the summary (C4.4): the booking grows where it is; the time stays while it still fits
  const addService = (id: string) => {
    if (ids.includes(id)) return
    if (ids.length + 1 > SERVICES_MAX) {
      toast(t('services.max', { max: SERVICES_MAX }))
      return
    }
    setAdded(true)
    set({ services: serviceIdsParam([...ids, id]) })
  }
  // Clear (the summary's Tertiary S): back to the first step with nothing picked, Undo puts it all back; a specialist
  // the flow began with stays (they're its first step)
  const clear = () => {
    const before = search
    void navigate({
      to: '.',
      search: search.first === 'staff' ? { first: 'staff', staff: search.staff } : {},
      resetScroll: true,
    })
    toast(t('summary.cleared'), {
      action: { label: t('summary.undo'), onClick: () => void navigate({ to: '.', search: before, replace: true }) },
    })
  }

  // the sdk's own callbacks keep the cache (the booking, my lists, the free times); the page's run after them
  const submit = () => {
    if (!done || date === null || time === null) return
    send.mutate(
      {
        type: 'appointment',
        business: detail.slug,
        serviceIds: ids,
        staffId: staff === 'any' ? null : staff,
        date,
        start: time,
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (booking) => {
          setConflict(null)
          // the sent page in place of the confirmation: the browser's Back doesn't send it again
          void navigate({ to: '.', search: { sent: booking.code }, replace: true, resetScroll: true })
        },
        onError: (error) => {
          if (isApiError(error, 'slot_taken')) {
            const details = slotTakenDetailsSchema.safeParse(error.details)
            setConflict({ date, time, alternatives: details.success ? details.data.alternatives : [] })
            // the day's free times are old now: the time step asks again when it opens (not this page, which would leave
            // the confirmation for a time no longer there)
            void queryClient.invalidateQueries({ queryKey: freeTimes.queryKey, refetchType: 'none' })
            return
          }
          // paused meanwhile, or this client is booked by phone only: the page says so and how (book Q-154)
          if (isApiError(error, 'online_blocked') || isApiError(error, 'online_disabled')) {
            void navigate({ ...pageLink, replace: true })
            return
          }
          toast(errorText(error))
        },
      },
    )
  }
  const next = () => {
    const to = steps[index + 1]
    if (done && to) go(to, true)
  }

  if (search.sent)
    return (
      <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
        <FocusedHeader
          start={
            <Link to="/$lang" params={{ lang }} aria-label={words('site.home', { brand })} className="flex">
              <Logo alt={brand} height={28} />
            </Link>
          }
          end={
            <Button asChild variant="plain" iconOnly aria-label={t('close')}>
              <Link to="/$lang/b/$slug" params={{ lang, slug: detail.slug }}>
                <X aria-hidden className="size-[22px]" />
              </Link>
            </Button>
          }
        />
        <main className="mx-auto w-full max-w-160 px-6 pt-14 pb-24 max-sm:px-4 max-sm:pt-10 max-sm:pb-16">
          <SentView code={search.sent} detail={detail} />
        </main>
      </div>
    )

  const hint =
    step === 'time'
      ? stale !== null
        ? t('summary.pickFitting', { duration: fmt.duration(total.minutes) })
        : t('summary.pickTime')
      : step === 'confirm'
        ? taken
          ? t('confirm.pickNew')
          : signedIn && mustTick
            ? t('confirm.tickAddress')
            : t('confirm.needNumber')
        : t('summary.pickService')
  // only Time (once a time is chosen) and Confirm have a primary; the single-pick steps move on by themselves
  const action = stepHasAction(step) && (step === 'confirm' || done)
  const cta = !action ? null : step === 'confirm' ? (
    <div className="flex flex-col gap-2">
      <Button size="l" variant="primary" className="w-full" disabled={!done} loading={send.isPending} onClick={submit}>
        {t('confirm.send')}
      </Button>
      <TermsNote word="booking" />
    </div>
  ) : (
    <Button size="l" variant="primary" className="w-full" disabled={!done} onClick={next}>
      {t('summary.continue')}
    </Button>
  )
  // the summary's «Add a service»: the specialist's services, everything with «any»
  const add = (
    <AddService
      groups={named ? servicesOf(detail.serviceGroups, named) : detail.serviceGroups}
      picked={ids}
      onPick={addService}
      listLabel={named ? t('summary.theirServices', { name: named.name }) : t('summary.allServices')}
      searchLabel={
        named
          ? t('services.searchTheirs', {
              name: named.name,
              count: servicesOf(detail.serviceGroups, named).reduce((n, g) => n + g.services.length, 0),
            })
          : t('services.search', { count: detail.serviceGroups.reduce((n, g) => n + g.services.length, 0) })
      }
    />
  )
  const after =
    step === 'confirm' && detail.confirmMode !== 'instant' && detail.typicalConfirmMinutes
      ? t('summary.confirmsWithin', { name: detail.name, time: fmt.duration(detail.typicalConfirmMinutes) })
      : null
  const summary = (withCta: boolean, inSheet = false) => (
    <Summary
      detail={detail}
      picked={picked}
      total={total}
      staffName={(index >= steps.indexOf('staff') || search.staff !== undefined) && picked.length > 0 ? staffName : null}
      date={step !== 'services' ? date : null}
      time={step !== 'services' ? time : null}
      stale={step !== 'services' ? stale : null}
      cta={withCta ? cta : null}
      hint={withCta && !done && step === 'confirm' ? hint : null}
      after={withCta ? after : null}
      confirm={step === 'confirm'}
      sheet={inSheet}
      notice={
        step === 'confirm' && changed ? (
          <ChangedNotice
            name={detail.name}
            changed={changed}
            address={detail.address}
            hours={date !== null ? { weekday: dow(date), hours: detail.hours[dow(date)] ?? null } : null}
            phone={detail.phone}
            seen={seen}
            onSeen={setSeen}
          />
        ) : null
      }
      onClear={locked ? undefined : clear}
      add={locked || step === 'services' ? undefined : add}
      onRemove={locked ? undefined : (id) => set({ services: serviceIdsParam(ids.filter((s) => s !== id)) })}
      onChangeStaff={locked || step === 'staff' ? undefined : () => go('staff', true)}
      onChangeTime={locked || step === 'time' ? undefined : () => go('time', true)}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
      <FocusedHeader
        start={
          // the flow began on the services (or on the specialist opened again from them): Back is the business page
          index === 0 || step === 'services' ? (
            <Button asChild variant="tertiary" className="-ml-2.5 min-w-0 pr-4 pl-2.5">
              <Link {...pageLink}>
                <ChevronLeft aria-hidden />
                {t('back')}
              </Link>
            </Button>
          ) : (
            <Button variant="tertiary" className="-ml-2.5 min-w-0 pr-4 pl-2.5" onClick={() => go(steps[index - 1] ?? 'services', false)}>
              <ChevronLeft aria-hidden />
              {t('back')}
            </Button>
          )
        }
        middle={
          <Stepper
            aria-label={t('stepsLabel')}
            // the specialist chosen on the business page reads as done («Jeren · Change»), until that choice is open again
            steps={steps.map((s) => t(`steps.${s}`))}
            current={index}
            reached={reachedStep(choice, steps)}
            onStepClick={(i) => go(steps[i] ?? 'services', false)}
            className="self-stretch"
          />
        }
        end={
          <Button asChild variant="plain" iconOnly aria-label={t('close')}>
            <Link {...pageLink}>
              <X aria-hidden className="size-[22px]" />
            </Link>
          </Button>
        }
      />
      <div className={`${wrap} flex-1`}>
        <div className="flex flex-wrap items-start gap-10 pt-10 pb-24 max-md:pb-10 max-sm:pt-6">
          <main className="min-w-0 flex-[999_1_560px]">
            <div className="flex max-w-180 flex-col">
              {step === 'services' && (
                <ServicesStep
                  detail={detail}
                  picked={picked}
                  staff={search.staff}
                  first={search.first === 'staff'}
                  onToggle={pickServices}
                  onChangeStaff={() => go('staff', true)}
                />
              )}
              {step === 'staff' && (
                <StaffStep
                  detail={detail}
                  serviceIds={ids}
                  staff={staff}
                  // the same specialist again keeps the chosen time; «any» over someone the services rule out (still in
                  // the address) is the client's choice too, so they don't come back
                  onPick={(id) =>
                    moveOn('staff', id === staff ? { staff: id } : { staff: id, time: undefined }, {
                      services: ids.length > 0,
                      staff: true,
                    })
                  }
                />
              )}
              {step === 'time' && (
                <TimeStep
                  slug={detail.slug}
                  serviceIds={ids}
                  minutes={total.minutes}
                  staff={staff}
                  staffName={staffName}
                  date={date}
                  time={time}
                  onDate={(day) => {
                    setAdded(false)
                    set({ date: day, time: undefined })
                  }}
                  onTime={(start, day) => {
                    setAdded(false)
                    set({ date: day, time: start })
                  }}
                />
              )}
              {step === 'confirm' && (
                <ConfirmStep
                  detail={detail}
                  me={me.data ?? null}
                  summary={summary(false)}
                  note={note}
                  onNote={setNote}
                  taken={taken?.alternatives ?? null}
                  onAlternative={(a) => set({ date: a.date, time: a.start })}
                  onOtherTime={() => go('time', false)}
                />
              )}
            </div>
          </main>
          <aside aria-label={t('summaryLabel')} className="sticky top-6 min-w-0 flex-[1_1_340px] max-md:hidden">
            {summary(true)}
          </aside>
        </div>
      </div>
      {/* the bar is the summary under 1024 (C4.4 «390 · the bottom bar»): the count and total, the time under it; its left
          part opens the whole card as a sheet, except on Confirm, where the card is in the flow */}
      <ActionBar
        className="md:hidden"
        aria-label={t('summaryLabel')}
        role="region"
        action={cta}
        onExpand={step !== 'confirm' && picked.length > 0 ? () => setSheet(true) : undefined}
        expanded={sheet}
      >
        <span className="truncate text-body font-semibold">
          {picked.length === 0 ? t('summary.barNone') : t('summary.bar', { count: picked.length, total: fmt.price(total.price) })}
        </span>
        <span className="truncate text-dense text-n-600">
          {date !== null && time !== null && step !== 'services' && step !== 'confirm'
            ? t('summary.when', { date: fmt.shortDate(calendarAt(date, time).date), range: fmt.timeRange(time, time + total.minutes) })
            : done
              ? t('summary.payAtPlace')
              : hint}
        </span>
      </ActionBar>
      {step !== 'confirm' && (
        <SummarySheet
          open={sheet}
          onOpenChange={setSheet}
          onClear={
            locked || picked.length === 0
              ? undefined
              : () => {
                  setSheet(false)
                  clear()
                }
          }
          footer={cta}
        >
          {summary(false, true)}
        </SummarySheet>
      )}
    </div>
  )
}
