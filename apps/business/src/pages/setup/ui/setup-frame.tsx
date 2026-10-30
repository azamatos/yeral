import { Link } from '@tanstack/react-router'
import type { SetupStep } from '@yeral/domain/setup'
import { Logo } from '@yeral/ui/brand'
import { ProgressBar } from '@yeral/ui/progress-bar'
import { Stepper } from '@yeral/ui/stepper'
import { textLink } from '@yeral/ui/text-link'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { SUPPORT_LINE } from '@/shared/config'
import { stepIndex, WIZARD_STEPS, type WizardStep } from '../model/steps'

/** The first way to reach Ýeral that is set, for the sidebar's "Questions?" line; none: no line. */
const SUPPORT_CONTACT = SUPPORT_LINE.phone ?? SUPPORT_LINE.telegram ?? SUPPORT_LINE.email

/** What a step tells the frame: whether it can go on (and the hint while it can't), and how to keep what's typed. */
export type StepAction = {
  valid: boolean
  /** Why Continue waits («Pick the address from the list.»): the disabled button's description. */
  hint?: string
  /** Saving: Continue spins, the step list and «Continue later» wait. */
  busy: boolean
  /** False while the step can't go on yet (loading, or not built): Continue stays disabled. */
  ready: boolean
  /**
   * Saves what's typed when it's valid and changed: before Continue moves the draft on, and before Back, the step list
   * or «Continue later» leave the step. False when it failed (the person heard why) and the step stays.
   */
  save: () => Promise<boolean>
  /** Where «Continue later» reopens when the save made the draft (the business step's first save: the address step). */
  reopens?: SetupStep
}

/** The step's name in the list: the phone step is «Account» for someone who already has a business. */
export function useStepName() {
  const t = useTranslations('setup.names')
  return (step: WizardStep, more: boolean) => (step === 'phone' && more ? t('account') : t(step))
}

/** «Ýeral» + the «Business» tag, one link home (B-Onboarding `.lp` and `.mb`). */
function Lockup({ height }: { height: number }) {
  const t = useTranslations()
  return (
    <Link to="/" className="flex flex-none items-center gap-2.5 rounded-s focus-visible:shadow-focus focus-visible:outline-none">
      <Logo alt={t('common.brand')} height={height} />
      <span className="inline-flex h-5.5 items-center rounded-pill border border-a-line bg-a-50 px-2 text-micro font-semibold text-a-600">
        {t('app.tag')}
      </span>
    </Link>
  )
}

/**
 * The setup wizard's frame (B-Onboarding, design §27.2): from 1024 a 360 aside on n-50 (the lockup, the title and
 * «8 steps · about 5 minutes · free», the step list with summaries, «Continue later» and the support line at the
 * bottom); under 1024 a sticky header with «4 / 8 · Hours», «Continue later» and the 3 px progress bar. The step's
 * content sits in a 736 column (padding 64 48 → 40 32 → 28 16) above the sticky WizardFooter.
 */
export function SetupFrame({
  current,
  reached,
  more,
  summaries,
  canOpen,
  onOpen,
  onLater,
  live,
  footer,
  children,
}: {
  current: WizardStep
  /** The furthest step reached. */
  reached: WizardStep
  /** Someone who already has a business creates another one: step 1 is their account. */
  more: boolean
  summaries: Partial<Record<WizardStep, ReactNode>>
  canOpen: (step: WizardStep) => boolean
  onOpen: (step: WizardStep) => void
  /** «Continue later»: left out where it can't save (the done step). */
  onLater?: () => void
  /** Read out while the step saves («Saving»). */
  live?: string
  footer: ReactNode
  children: ReactNode
}) {
  const t = useTranslations()
  const name = useStepName()
  const total = WIZARD_STEPS.length
  const n = stepIndex(current) + 1
  // «Continue later»: with its icon in the aside; in the phone header the words alone, up to half the row, wrapping (a
  // longer language's too) and shrinking on a narrow phone (B-Onboarding `.mb`), its target still 32 high
  const laterButton = (header: boolean) =>
    onLater && (
      <button
        type="button"
        onClick={onLater}
        className={`${textLink} inline-flex min-h-8 items-center gap-1.5 text-small ${header ? 'max-w-1/2 min-w-0 flex-[0_1_auto] justify-end text-right' : ''}`}
      >
        {!header && <LogOut aria-hidden strokeWidth={1.75} className="size-4" />}
        {t('setup.later')}
      </button>
    )
  const later = laterButton(false)
  return (
    <div className="flex min-h-dvh items-stretch bg-n-0 text-n-900">
      <aside
        aria-label={t('setup.progress')}
        className="sticky top-0 flex h-dvh w-90 flex-none flex-col gap-7 overflow-y-auto border-r border-n-200 bg-n-50 px-5 pt-7 pb-6 max-md:hidden"
      >
        <div className="px-3">
          <Lockup height={28} />
        </div>
        <div className="flex flex-col gap-1 px-3">
          <span className="text-body-l leading-6 font-semibold tracking-[-0.01em]">{more ? t('setup.titleMore') : t('setup.title')}</span>
          <span className="text-dense text-n-600">{more ? t('setup.captionMore') : t('setup.caption')}</span>
        </div>
        <Stepper
          orientation="vertical"
          aria-label={t('setup.steps')}
          doneLabel={t('setup.doneMark')}
          steps={WIZARD_STEPS.map((s) => name(s, more))}
          summaries={WIZARD_STEPS.map((s) => summaries[s])}
          current={stepIndex(current)}
          reached={stepIndex(reached)}
          canOpen={(i) => canOpen(WIZARD_STEPS[i]!)}
          onStepClick={(i) => onOpen(WIZARD_STEPS[i]!)}
        />
        <div className="flex-1" />
        <div className="flex flex-col items-start gap-1.5 border-t border-n-200 px-3 pt-4">
          {later && (
            <>
              {later}
              <span className="-mt-1 text-dense text-n-600">{t('setup.laterNote')}</span>
            </>
          )}
          {SUPPORT_CONTACT && (
            <span className="text-dense text-n-600">
              {t.rich('setup.questions', {
                brand: t('common.brand'),
                contact: SUPPORT_CONTACT,
                b: (chunks) => <span className="font-semibold whitespace-nowrap text-n-900">{chunks}</span>,
              })}
            </span>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-6 border-b border-n-200 bg-n-0 md:hidden">
          <div className="flex h-14 items-center gap-4 px-6 max-sm:gap-3 max-sm:px-4">
            <Lockup height={24} />
            <span className="line-clamp-2 min-w-0 text-small leading-4.5 font-semibold">
              <span className="whitespace-nowrap text-n-500">{t('setup.stepShort', { n, total })}</span> · {name(current, more)}
            </span>
            <div className="flex-1" />
            {laterButton(true)}
          </div>
          <ProgressBar variant="flow" label={t('setup.progress')} value={n} max={total} valueText={t('setup.stepOf', { n, total })} />
        </header>
        <main className="mx-auto w-full max-w-184 flex-1 px-12 py-16 max-md:px-8 max-md:pt-10 max-md:pb-12 max-sm:px-4 max-sm:pt-7 max-sm:pb-10">
          <span role="status" className="sr-only">
            {live}
          </span>
          {children}
        </main>
        {footer}
      </div>
    </div>
  )
}

/** A step's header (B-Onboarding `.shd`): «Step 2 of 8», the title (32/38 → 26/32 on phones) and its lead. */
export function StepHeader({ step, title, lead, titleId }: { step: WizardStep; title: ReactNode; lead: ReactNode; titleId?: string }) {
  const t = useTranslations('setup')
  return (
    <header className="flex flex-col gap-2.5 pb-2">
      <span className="text-label text-n-500 uppercase">{t('stepOf', { n: stepIndex(step) + 1, total: WIZARD_STEPS.length })}</span>
      <h1 id={titleId} className="m-0 text-h2 max-sm:text-[26px] max-sm:leading-8">
        {title}
      </h1>
      <p className="m-0 max-w-140 text-body text-n-600 [&_b]:font-semibold [&_b]:text-n-900">{lead}</p>
    </header>
  )
}
