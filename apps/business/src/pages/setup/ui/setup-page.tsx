import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { Setup } from '@yeral/contract/setup'
import { formatPhone } from '@yeral/domain/phone'
import type { SetupStep } from '@yeral/domain/setup'
import { useCodeOnScreen } from '@yeral/features/auth-by-phone'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { WizardFooter } from '@yeral/ui/wizard-footer'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { BUSINESS_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { isWizardStep, nextStep, stepFor, stepIndex, WIZARD_STEPS, type WizardStep } from '../model/steps'
import type { Category } from '@yeral/contract/catalog'
import { useAddressStep } from './address-step'
import { BusinessStep } from './business-step'
import { useDoneStep, type AfterSetup } from './done-step'
import { useHoursStep } from './hours-step'
import { PhoneStep } from './phone-step'
import { useRulesStep } from './rules-step'
import { useServicesStep } from './services-step'
import { SetupFrame, useStepName, type StepAction } from './setup-frame'
import { useTeamStep } from './team-step'

/**
 * `/setup/{step}` — the setup wizard (B-Onboarding, design §27.2, book B-02–B-06, Q-200). Someone signed in with a
 * name goes through the steps after the phone; the draft the business step makes reopens at its saved step. Signed
 * out (or without a name), the wizard starts at step 1, the phone.
 */
export function SetupPage() {
  const t = useTranslations()
  const sdk = useSdk()
  const { step = '' } = useParams({ strict: false })
  const me = useQuery(sdk.me.get())
  // asked with the account, so step 1's demo note is there when the number opens
  useCodeOnScreen()
  usePageTitle(t('setup.title'))
  // an unknown step opens where the person is in the wizard
  const asked = isWizardStep(step) ? step : 'phone'
  if (me.isPending) return <Waiting />
  // a failed refetch keeps the person on screen; only not knowing who is signed in at all is a failure
  if (me.isError && me.data === undefined) throw me.error
  // signed out, or the new account's name not given yet: step 1 first, wherever the address pointed
  if (!me.data?.firstName) return step === 'phone' ? <PhoneStep /> : <Navigate to="/setup/$step" params={{ step: 'phone' }} replace />
  return <Wizard asked={asked} me={me.data} />
}

function Waiting() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

function Wizard({ asked, me }: { asked: WizardStep; me: Me }) {
  const sdk = useSdk()
  const locale = useLocale()
  const setup = useQuery(sdk.setup.mine())
  const workspaces = useQuery(sdk.team.workspaces())
  const categories = useQuery(sdk.catalog.categories(locale))
  // the setup just finished: the wizard opens the workspace, whatever the draft's refresh says meanwhile (the checklist's
  // «Add»: the business profile, where the logo, the photos and the About are)
  const [finished, setFinished] = useState<{ slug: string; after: AfterSetup } | null>(null)
  if (finished)
    return (
      <Navigate
        to={finished.after === 'calendar' ? '/w/$slug/calendar' : '/w/$slug/settings/profile'}
        params={{ slug: finished.slug }}
        replace
      />
    )
  if (setup.isPending || workspaces.isPending || categories.isPending) return <Waiting />
  // a failed refetch keeps what's on screen (and what's typed); only a first load that failed is a failure
  if (!setup.data || !workspaces.data || !categories.data)
    throw setup.error ?? workspaces.error ?? categories.error ?? new Error('setup data missing')
  const draft = setup.data.setup
  // the done step's draft gone (finished in another tab): the app's start finds the workspace, not a new draft
  if (!draft && asked === 'done') return <Navigate to="/" replace />
  const step = stepFor(asked, draft?.step ?? null)
  if (step !== asked) return <Navigate to="/setup/$step" params={{ step }} replace />
  // appointments only at the first launch: the table and class categories come later (book Q-030)
  const pickable = categories.data.items.filter((c) => c.bookingTypes.includes('appointment'))
  // a category the list no longer offers is picked again
  const categoryId = draft && pickable.some((c) => c.id === draft.categoryId) ? draft.categoryId : null
  return (
    <Steps
      key={draft?.slug ?? 'new'}
      step={step}
      me={me}
      draft={draft && { ...draft, categoryId }}
      more={workspaces.data.items.length > 0}
      back={workspaces.data.items.find((w) => w.slug === workspaces.data.current)?.name ?? workspaces.data.items[0]?.name ?? null}
      categories={pickable}
      onFinished={(slug, after) => setFinished({ slug, after })}
    />
  )
}

/** What the wizard reads of the draft (`GET /v1/me/setup`); `categoryId` is null when the list no longer offers it. */
type Draft = Omit<Setup, 'categoryId' | 'logo'> & { categoryId: string | null }

function Steps({
  step,
  me,
  draft,
  more,
  back,
  categories,
  onFinished,
}: {
  step: SetupStep
  me: Me
  draft: Draft | null
  more: boolean
  /** The workspace someone came from to create this one (the done step names it), or null. */
  back: string | null
  categories: Pick<Category, 'id' | 'name' | 'hint' | 'starterGroups'>[]
  onFinished: (slug: string, after: AfterSetup) => void
}) {
  const t = useTranslations()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const stepName = useStepName()
  const [name, setName] = useState(draft?.name ?? '')
  const [categoryId, setCategoryId] = useState(draft?.categoryId ?? null)
  const start = useMutation(sdk.setup.start())
  const saveStep = useMutation(sdk.setup.step(draft?.slug ?? ''))
  const updateProfile = useMutation(sdk.settings.updateProfile(draft?.slug ?? ''))

  const reached: SetupStep = draft?.step ?? 'business'
  const phone = formatPhone(me.phone)
  const ownerName = me.name ?? me.firstName ?? ''
  // spaces around the name don't count: the api trims it before its limit
  const length = name.trim().length
  const businessValid = length > 0 && length <= BUSINESS_NAME_MAX && !!categoryId
  const edited = step === 'business' && (name.trim() !== (draft?.name ?? '') || categoryId !== (draft?.categoryId ?? null))

  const go = (to: WizardStep) => void navigate({ to: '/setup/$step', params: { step: to } })
  const failed = (error: unknown) => void toast(errorText(error))

  /**
   * The business step's name and category into the draft: a new draft (saved at the address step), or the edits to
   * the one there. `false` when it failed (the person heard why).
   */
  const saveBusiness = async (): Promise<boolean> => {
    const values = { name: name.trim(), categoryId: categoryId! }
    try {
      // the sdk refreshes the draft (`GET /v1/me/setup`) before these resolve, so the next step finds it
      if (!draft) await start.mutateAsync(values)
      else if (edited) {
        await updateProfile.mutateAsync(values)
        // the profile's save refreshes the settings, not the draft's name and category
        await queryClient.invalidateQueries({ queryKey: sdk.setup.mine().queryKey })
      }
      return true
    } catch (error) {
      // a draft made meanwhile (another tab): the wizard goes on with that one
      if (isApiError(error, 'setup_in_progress')) await queryClient.invalidateQueries({ queryKey: sdk.setup.mine().queryKey })
      failed(error)
      return false
    }
  }

  const hint = !length
    ? t('setup.business.hintName')
    : length > BUSINESS_NAME_MAX
      ? t('setup.business.hintLong', { max: BUSINESS_NAME_MAX })
      : t('setup.business.hintCategory')

  // each step's content and what it tells the frame; the frame stays one element around every step
  const address = useAddressStep(draft?.slug ?? '', step === 'address' && !!draft)
  const hours = useHoursStep(draft?.slug ?? '', step === 'hours' && !!draft, !!draft && stepIndex(reached) >= stepIndex('hours'))
  // the draft's category as the list gives it (its starter list); one the list no longer offers has none
  const category = draft ? (categories.find((c) => c.id === draft.categoryId) ?? { id: '', name: draft.category, starterGroups: [] }) : null
  const services = useServicesStep(
    draft?.slug ?? '',
    step === 'services' && !!draft,
    !!draft && stepIndex(reached) >= stepIndex('services'),
    category,
  )
  const team = useTeamStep(draft?.slug ?? '', step === 'team' && !!draft, { name: ownerName, phone: me.phone })
  const rules = useRulesStep(draft?.slug ?? '', step === 'rules' && !!draft)
  const done = useDoneStep(draft, step === 'done' && !!draft, back, onFinished)
  const [body, action]: [ReactNode, StepAction] =
    step === 'business'
      ? [
          <BusinessStep
            more={more}
            owner={{ name: ownerName, phone }}
            name={name}
            onName={setName}
            pageSlug={draft?.slug}
            categoryId={categoryId}
            onCategory={setCategoryId}
            categories={categories}
          />,
          {
            valid: businessValid,
            hint,
            busy: start.isPending || updateProfile.isPending,
            ready: true,
            // a new draft from a valid business step; edits to the one there
            save: () => (businessValid && (!draft || edited) ? saveBusiness() : Promise.resolve(true)),
            // a new draft starts at the address step, as Continue would leave it
            reopens: !draft && businessValid ? 'address' : undefined,
          },
        ]
      : step === 'address'
        ? [address.body, address.action]
        : step === 'hours'
          ? [hours.body, hours.action]
          : step === 'services'
            ? [services.body, services.action]
            : step === 'team'
              ? [team.body, team.action]
              : step === 'rules'
                ? [rules.body, rules.action]
                : [done.body, done.action]
  const busy = action.busy || saveStep.isPending

  /** Continue: the step saved, the draft moved on to the next step (a new draft already starts at the address). */
  const next = nextStep(step)
  const onContinue = async () => {
    if (busy || !next || !(await action.save())) return
    try {
      if (draft && stepIndex(draft.step) < stepIndex(next)) await saveStep.mutateAsync(next)
      go(next)
    } catch (error) {
      failed(error)
    }
  }

  /** Back or a step in the list: the step's valid edits are saved first, so leaving it never drops them. */
  const open = async (to: WizardStep) => {
    if (busy || !(await action.save())) return
    go(to)
  }

  const later = async () => {
    if (busy) return
    try {
      if (!(await action.save())) return
      if (draft) await saveStep.mutateAsync(step)
      // reopening lands where it was left
      toast(t('setup.laterSaved', { phone, step: stepName(action.reopens ?? step, more) }))
    } catch (error) {
      failed(error)
    }
  }

  const previous = WIZARD_STEPS[stepIndex(step) - 1]
  const footer = (
    <WizardFooter
      // the phone step is the sign-in, done once someone is signed in: the business step has no Back
      back={step !== 'business' && previous ? { label: t('setup.back'), onClick: () => void open(previous) } : undefined}
      start={
        more && step === 'business' ? (
          <Button asChild variant="ghost" size="l">
            <Link to="/">{t('setup.cancel')}</Link>
          </Button>
        ) : undefined
      }
      hint={action.ready && !action.valid ? action.hint : undefined}
      primary={
        step === 'done'
          ? {
              children: (
                <>
                  {done.primary.label}
                  {done.primary.icon}
                </>
              ),
              disabled: !action.ready,
              loading: busy,
              loadingLabel: t('setup.saving'),
              onClick: done.primary.finish,
            }
          : {
              children: t('setup.continue'),
              // while the step loads, or what's typed isn't valid yet
              disabled: !action.ready || !action.valid,
              loading: busy,
              loadingLabel: t('setup.saving'),
              onClick: () => void onContinue(),
            }
      }
    />
  )

  const summaries: Partial<Record<WizardStep, ReactNode>> = {
    phone: more ? `${ownerName} · ${phone}` : phone,
    business: draft && `${draft.name} · ${draft.category}`,
    address: draft?.address && `${draft.address.line}, ${draft.address.city.name}`,
    hours: hours.summary,
    services: services.summary,
  }
  return (
    <SetupFrame
      current={step}
      reached={reached}
      more={more}
      summaries={summaries}
      canOpen={(s) => !busy && s !== 'phone' && stepIndex(s) <= stepIndex(reached) && (stepIndex(s) < stepIndex(step) || action.valid)}
      onOpen={(s) => void open(s)}
      onLater={step === 'done' ? undefined : () => void later()}
      live={busy ? t('setup.saving') : undefined}
      footer={footer}
    >
      {body}
    </SetupFrame>
  )
}
