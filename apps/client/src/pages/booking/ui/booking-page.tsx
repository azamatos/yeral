import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { parseHm } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { ActionBar } from '@yeral/ui/action-bar'
import { Button } from '@yeral/ui/button'
import { Stepper } from '@yeral/ui/stepper'
import { ChevronLeft, X } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { parseServiceIds, pickedServices, selectionTotal, ServicePicker, serviceIdsParam, toggleService } from '@/features/pick-services'
import { wrap } from '@/shared/ui'
import { chosenStaff, currentStep, reachedStep, stepDone, STEPS, type BookingSearch, type Step } from '../model/flow'
import { StaffStep } from './staff-step'
import { StepTitle } from './step-title'
import { Summary } from './summary'
import { TimeStep } from './time-step'

/**
 * `/{lang}/b/{slug}/book` — the appointment booking flow (Booking, book C-12–C-14): the focused header (Back, the steps,
 * Close back to the page), one step at a time with the booking's summary beside it from 1024 and the action bar under
 * it. Everything chosen lives in the address (`?services=&staff=&date=&time=&step=`): a step change is a new history
 * entry (Back walks the steps), a pick replaces it. The confirmation and the sent page come next (P4 slice 3, C4).
 */
export function BookingPage() {
  const { slug = '' } = useParams({ strict: false })
  const lang = useLocale()
  const sdk = useSdk()
  const t = useTranslations('booking')
  const fmt = useFmt()
  const { data: detail } = useSuspenseQuery(sdk.catalog.business(slug, lang))
  const search: BookingSearch = useSearch({ strict: false })
  const navigate = useNavigate()
  const picked = pickedServices(detail, parseServiceIds(search.services))
  const ids = picked.map((s) => s.id)
  const staff = chosenStaff(detail, ids, search.staff)
  const time = search.time ? parseHm(search.time) : null
  const choice = { services: ids, time }
  const step = currentStep(search.step, choice)
  const index = STEPS.indexOf(step)
  const done = stepDone(step, choice)
  const total = selectionTotal(picked)

  const set = (patch: Partial<BookingSearch>, newEntry = false) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
      replace: !newEntry,
      // a new step starts at its top (client spec); a pick inside a step keeps the page where it is
      resetScroll: newEntry,
    })
  const go = (to: Step) => set({ step: to }, true)
  // a new service may leave the chosen specialist and time behind: they're dropped with it (Booking `set`)
  const pickServices = (next: string[]) => set({ services: serviceIdsParam(next), time: undefined })
  const next = () => {
    const to = STEPS[index + 1]
    if (done && to) go(to)
  }
  const hint = step === 'time' ? t('summary.pickTime') : t('summary.pickService')
  const cta =
    step === 'confirm' ? null : (
      <Button size="l" variant="primary" className="w-full" disabled={!done} onClick={next}>
        {t('summary.continue')}
      </Button>
    )
  const pageLink = { to: '/$lang/b/$slug' as const, params: { lang, slug: detail.slug }, search: { services: serviceIdsParam(ids) } }

  return (
    <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
      <header className="grid h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-n-200 bg-n-0 px-6 max-sm:px-4">
        <div className="flex min-w-0 items-center">
          {index === 0 ? (
            <Button asChild variant="ghost" className="-ml-2.5 min-w-0 pr-4 pl-2.5">
              <Link {...pageLink}>
                <ChevronLeft aria-hidden />
                {t('back')}
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" className="-ml-2.5 min-w-0 pr-4 pl-2.5" onClick={() => go(STEPS[index - 1] ?? 'services')}>
              <ChevronLeft aria-hidden />
              {t('back')}
            </Button>
          )}
        </div>
        <Stepper
          aria-label={t('stepsLabel')}
          steps={STEPS.map((s) => t(`steps.${s}`))}
          current={index}
          reached={reachedStep(choice)}
          onStepClick={(i) => go(STEPS[i] ?? 'services')}
          className="self-stretch"
        />
        <div className="flex min-w-0 justify-end">
          <Button asChild variant="ghost" iconOnly aria-label={t('close')}>
            <Link {...pageLink}>
              <X aria-hidden className="size-[22px]" />
            </Link>
          </Button>
        </div>
      </header>
      <div className={`${wrap} flex-1`}>
        <div className="flex flex-wrap items-start gap-10 pt-10 pb-24 max-md:pb-10 max-sm:pt-6">
          <main className="min-w-0 flex-[999_1_560px]">
            <div className="flex max-w-180 flex-col">
              {step === 'services' && (
                <>
                  <StepTitle title={t('services.title')} lead={t('services.lead')} />
                  <div className="mt-5 flex flex-col gap-7">
                    <ServicePicker
                      groups={detail.serviceGroups}
                      picked={ids}
                      onToggle={(id) => pickServices(toggleService(ids, id))}
                      groupHeading="h2"
                    />
                  </div>
                </>
              )}
              {step === 'staff' && (
                <StaffStep detail={detail} serviceIds={ids} staff={staff} onPick={(id) => set({ staff: id, time: undefined })} />
              )}
              {step === 'time' && (
                <TimeStep
                  slug={detail.slug}
                  serviceIds={ids}
                  minutes={total.minutes}
                  staff={staff}
                  staffName={detail.specialists.find((s) => s.id === staff)?.name ?? null}
                  date={search.date}
                  time={time}
                  onDate={(date) => set({ date, time: undefined })}
                  onTime={(start, day) => set({ date: day, time: fmt.time(start) })}
                />
              )}
              {step === 'confirm' && <StepTitle title={t('confirm.title')} lead={t('confirm.lead')} />}
            </div>
          </main>
          <aside aria-label={t('summaryLabel')} className="sticky top-6 min-w-0 flex-[1_1_340px] max-md:hidden">
            <Summary
              detail={detail}
              picked={picked}
              staff={staff}
              date={step !== 'services' ? search.date : undefined}
              time={step !== 'services' ? time : null}
              showStaff={index > 0}
              cta={cta}
              hint={done ? null : hint}
            />
          </aside>
        </div>
      </div>
      {cta && (
        <ActionBar className="md:hidden" aria-label={t('summaryLabel')} role="region" action={cta}>
          <span className="truncate text-body font-semibold">
            {picked.length === 0
              ? t('summary.barNone')
              : time !== null
                ? t('summary.barTime', { count: picked.length, total: fmt.price(total.price), time: fmt.time(time) })
                : t('summary.bar', { count: picked.length, total: fmt.price(total.price) })}
          </span>
          <span className="truncate text-dense text-n-600">{done ? t('summary.payAtPlace') : hint}</span>
        </ActionBar>
      )}
    </div>
  )
}
