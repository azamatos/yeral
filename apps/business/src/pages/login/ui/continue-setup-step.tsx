import { Link } from '@tanstack/react-router'
import type { Setup } from '@yeral/contract/setup'
import type { SetupStep } from '@yeral/domain/setup'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Check, Clock } from 'lucide-react'
import { useFormatter, useTranslations } from 'use-intl'
import { AccountLine } from '@/features/sign-in'
import { AuthPage } from '@/shared/ui'
import { setupProgress } from '../model/entry'
import { BusinessMark } from './business-mark'
import { DeclinedLine } from './declined-line'

/**
 * An unfinished setup (B-Login `step=setup`, ContinueSetupCard, book B-07 step 4, Q-200): the draft, the step it
 * stopped at among the wizard's 8, what's done with its summary and what's ahead; Continue reopens the wizard there.
 * Everything comes from the draft (`GET /v1/me/setup`, chapter 9 21.10.2026).
 */
export function ContinueSetupStep({
  setup,
  who,
  onOtherNumber,
  leaving,
  declined,
}: {
  setup: Setup
  who: string
  onOtherNumber: () => void
  leaving: boolean
  /** The business whose invite was just declined: the card says so on top. */
  declined: string | null
}) {
  const t = useTranslations()
  const format = useFormatter()
  const fmt = useFmt()
  const { n, total, done, before, ahead } = setupProgress(setup.step)
  // what the draft says about a step done (B-Login): the category, the address once one is saved
  const detail = (step: SetupStep): string | null => {
    if (step === 'business') return setup.category
    if (step === 'address' && setup.address) return fmt.addressIn(setup.address.line, setup.address.city.name)
    return null
  }
  const nextSteps = format.list(
    ahead.map((s) => t(`login.setup.ahead.${s}`)),
    { type: 'unit' },
  )

  return (
    <AuthPage
      focusKey="setup"
      media={
        <>
          {declined && <DeclinedLine business={declined} />}
          <div className="flex min-w-0 items-center gap-3.5">
            <BusinessMark name={setup.name} logo={setup.logo} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[17px] leading-6 font-semibold">{setup.name}</span>
              <span className="text-dense text-n-600">{t('login.setup.where', { category: setup.category })}</span>
            </span>
          </div>
        </>
      }
      eyebrow={t('login.setup.eyebrow', { n, total, step: t(`setup.names.${setup.step}`) })}
      title={t('login.setup.title', { business: setup.name })}
      lead={t('login.setup.lead', { step: setup.step })}
    >
      <div
        role="progressbar"
        aria-label={t('login.setup.progress')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={t('login.setup.progressText', { done, total })}
        className="flex gap-1"
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-pill', i < done ? 'bg-a-500' : 'bg-n-100')} />
        ))}
      </div>
      <ul aria-label={t('login.setup.doneList')} className="m-0 flex list-none flex-col gap-1.5 p-0 text-small text-n-900">
        {before.map((step) => {
          const more = detail(step)
          return (
            <li key={step} className="flex items-center gap-2">
              <Check aria-hidden strokeWidth={2} className="size-4 flex-none text-st-completed-ink" />
              {more ? t('login.setup.doneStep', { step: t(`setup.names.${step}`), detail: more }) : t(`setup.names.${step}`)}
            </li>
          )
        })}
        {ahead.length > 0 && (
          <li className="flex items-center gap-2 text-n-600">
            <Clock aria-hidden className="size-4 flex-none" />
            {t('login.setup.next', { steps: nextSteps })}
          </li>
        )}
      </ul>
      <Button asChild variant="primary" size="l" className="w-full">
        <Link to="/setup/$step" params={{ step: setup.step }}>
          {t('login.setup.continue')}
        </Link>
      </Button>
      <AccountLine who={who} onOtherNumber={onOtherNumber} busy={leaving} />
    </AuthPage>
  )
}
