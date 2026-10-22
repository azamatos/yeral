import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import { formatPhone } from '@yeral/domain/phone'
import type { SetupStep } from '@yeral/domain/setup'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { WizardFooter } from '@yeral/ui/wizard-footer'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage } from '@/shared/ui'
import { isWizardStep, stepFor, stepIndex, WIZARD_STEPS, type WizardStep } from '../model/steps'
import { BUSINESS_NAME_MAX, BusinessStep } from './business-step'
import { SetupFrame, StepHeader, useStepName } from './setup-frame'

/**
 * `/setup/{step}` — the setup wizard (B-Onboarding, design §27.2, book B-02–B-06, Q-200). Someone signed in with a
 * name goes through the steps after the phone; the draft the business step makes reopens at its saved step. Signed
 * out, the wizard starts at the sign-in: the phone step inside the wizard comes with its own piece of slice 2.
 */
export function SetupPage() {
  const t = useTranslations()
  const sdk = useSdk()
  const { step = '' } = useParams({ strict: false })
  const me = useQuery(sdk.me.get())
  usePageTitle(t('setup.title'))
  // an unknown step opens where the person is in the wizard
  const asked = isWizardStep(step) ? step : 'phone'
  if (me.isPending) return <Waiting />
  // a failed refetch keeps the person on screen; only not knowing who is signed in at all is a failure
  if (me.isError && me.data === undefined) throw me.error
  if (!me.data?.firstName) return <SignedOut />
  return <Wizard asked={asked} me={me.data} />
}

function Waiting() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

/** Not signed in (or the sign-up's name step isn't done): the sign-in comes first. */
function SignedOut() {
  const t = useTranslations('setup')
  return (
    <AuthPage focusKey="setup" title={t('title')} lead={t('signedOut.lead')}>
      <Button asChild variant="primary" size="l" className="w-full">
        <Link to="/login">{t('signedOut.login')}</Link>
      </Button>
    </AuthPage>
  )
}

function Wizard({ asked, me }: { asked: WizardStep; me: Me }) {
  const sdk = useSdk()
  const locale = useLocale()
  const setup = useQuery(sdk.setup.mine())
  const workspaces = useQuery(sdk.team.workspaces())
  const categories = useQuery(sdk.catalog.categories(locale))
  if (setup.isPending || workspaces.isPending || categories.isPending) return <Waiting />
  if (setup.isError) throw setup.error
  if (workspaces.isError) throw workspaces.error
  if (categories.isError) throw categories.error
  const draft = setup.data.setup
  const step = stepFor(asked, draft?.step ?? null)
  if (step !== asked) return <Navigate to="/setup/$step" params={{ step }} replace />
  // appointments only at the first launch: the table and class categories come later (book Q-030)
  const pickable = categories.data.items.filter((c) => c.bookingTypes.includes('appointment'))
  return (
    <Steps key={draft?.slug ?? 'new'} step={step} me={me} draft={draft} more={workspaces.data.items.length > 0} categories={pickable} />
  )
}

/** What the wizard reads of the draft (`GET /v1/me/setup`). */
type Draft = {
  slug: string
  name: string
  step: SetupStep
  category: string
  address: { line: string; city: { name: string } } | null
}

function Steps({
  step,
  me,
  draft,
  more,
  categories,
}: {
  step: SetupStep
  me: Me
  draft: Draft | null
  more: boolean
  categories: { id: string; name: string; hint: string }[]
}) {
  const t = useTranslations()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const stepName = useStepName()
  // the draft says its category by name, in the account's language, as the list does
  const [name, setName] = useState(draft?.name ?? '')
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.name === draft?.category)?.id ?? null)
  const start = useMutation(sdk.setup.start())
  const saveStep = useMutation(sdk.setup.step(draft?.slug ?? ''))
  const updateProfile = useMutation(sdk.settings.updateProfile(draft?.slug ?? ''))
  const busy = start.isPending || saveStep.isPending || updateProfile.isPending

  const reached: SetupStep = draft?.step ?? 'business'
  const phone = formatPhone(me.phone)
  const ownerName = me.name ?? me.firstName ?? ''
  const businessValid = !!name.trim() && name.length <= BUSINESS_NAME_MAX && !!categoryId
  const valid = step === 'business' ? businessValid : true

  const go = (to: WizardStep) => void navigate({ to: '/setup/$step', params: { step: to } })
  /** After a save: the draft as the api now has it, so the next step finds it there. */
  const reload = () => queryClient.fetchQuery({ ...sdk.setup.mine(), staleTime: 0 })
  const failed = (error: unknown) => void toast(errorText(error))

  const continueBusiness = async () => {
    const values = { name: name.trim(), categoryId: categoryId! }
    try {
      if (!draft) await start.mutateAsync(values)
      else {
        const before = categories.find((c) => c.name === draft.category)?.id
        if (values.name !== draft.name || values.categoryId !== before) await updateProfile.mutateAsync(values)
        if (stepIndex(draft.step) < stepIndex('address')) await saveStep.mutateAsync('address')
      }
      await reload()
      go('address')
    } catch (error) {
      // a draft made meanwhile (another tab): the wizard goes on with that one
      if (isApiError(error, 'setup_in_progress')) {
        await reload()
        go('business')
      }
      failed(error)
    }
  }

  const later = async () => {
    try {
      if (draft) await saveStep.mutateAsync(step)
      toast(t('setup.laterSaved', { phone, step: stepName(step, more) }))
    } catch (error) {
      failed(error)
    }
  }

  const hint = !name.trim()
    ? t('setup.business.hintName')
    : name.length > BUSINESS_NAME_MAX
      ? t('setup.business.hintLong', { max: BUSINESS_NAME_MAX })
      : t('setup.business.hintCategory')
  const previous = WIZARD_STEPS[stepIndex(step) - 1]
  const footer = (
    <WizardFooter
      // the phone step is the sign-in, done once someone is signed in: the business step has no Back
      back={step !== 'business' && previous ? { label: t('setup.back'), onClick: () => go(previous) } : undefined}
      start={
        more && step === 'business' ? (
          <Button asChild variant="ghost" size="l">
            <Link to="/">{t('setup.cancel')}</Link>
          </Button>
        ) : undefined
      }
      hint={step === 'business' && !businessValid ? hint : undefined}
      primary={
        step === 'done'
          ? undefined
          : {
              children: t('setup.continue'),
              // the steps after the business one come with their own pieces of slice 2
              disabled: step !== 'business' || !valid,
              loading: busy,
              loadingLabel: t('setup.saving'),
              onClick: () => void continueBusiness(),
            }
      }
    />
  )

  const summaries: Partial<Record<WizardStep, ReactNode>> = {
    phone: more ? `${ownerName} · ${phone}` : phone,
    business: draft && `${draft.name} · ${draft.category}`,
    address: draft?.address && `${draft.address.line}, ${draft.address.city.name}`,
  }
  return (
    <SetupFrame
      current={step}
      reached={reached}
      more={more}
      summaries={summaries}
      canOpen={(s) => s !== 'phone' && stepIndex(s) <= stepIndex(reached) && (stepIndex(s) < stepIndex(step) || valid)}
      onOpen={go}
      onLater={step === 'done' ? undefined : () => void later()}
      live={busy ? t('setup.saving') : undefined}
      footer={footer}
    >
      {step === 'business' ? (
        <BusinessStep
          more={more}
          owner={{ name: ownerName, phone }}
          name={name}
          onName={setName}
          categoryId={categoryId}
          onCategory={setCategoryId}
          categories={categories}
        />
      ) : (
        <LaterStep step={step} name={draft?.name ?? ''} />
      )}
    </SetupFrame>
  )
}

/** A step built by a later piece of slice 2: its header only (B-Onboarding's titles and leads). */
function LaterStep({ step, name }: { step: Exclude<SetupStep, 'business'>; name: string }) {
  const t = useTranslations('setup')
  const title = step === 'done' ? t('done.title', { name }) : t(`${step}.title`)
  return (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step={step} title={title} lead={t(`${step}.lead`)} />
    </section>
  )
}
