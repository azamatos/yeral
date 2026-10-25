import { useMutation } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import { localized } from '@yeral/domain/model'
import { formatPhone, isMobile, maskPhone } from '@yeral/domain/phone'
import { INVITE_DAYS, inviteExpiresAt } from '@yeral/domain/team'
import { today } from '@yeral/domain/time'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { cn } from '@yeral/ui/cn'
import { Check, Info, Lock } from 'lucide-react'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useFormatter, useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { FULL_NAME_MAX, SPECIALIZATION_MAX, TEAM_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { emptyInvite, inviteInput, phoneProblem, servicesDone, usesApp, whoDone, type InviteForm } from '../model/invite'
import { ServicePicker } from './service-picker'

const STEPS = ['who', 'services', 'review'] as const

/**
 * «Add a team member» (B-Team `inv`, design §8 «Topar», §28.4 Team, book B-44; owner only): 1 Who (the mobile number,
 * the name clients see, the full name the team sees, the specialization, the access level, a specialist's «Uses the
 * app»), 2 Services (in the menu's groups,
 * «All» per group), 3 Review (each row opens its step again, the note on what happens next), then Send invite, or Add
 * to the team for a specialist without the app (bookable at once, never signs in). A sent invite's link comes back in
 * the toast's «Copy invite link».
 */
export function AddMember({
  slug,
  people,
  menu,
  open,
  onOpenChange,
  opener,
  onLink,
  initial,
}: {
  slug: string
  people: TeamMember[]
  menu: Menu
  /** «Invite again»: the form filled in with someone who left. */
  initial?: InviteForm
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The button that opened it: the focus goes back to it (it isn't a Radix trigger). */
  opener: RefObject<HTMLButtonElement | null>
  onLink: (name: string, url: string) => void
}) {
  const t = useTranslations('settings.team.add')
  // nothing closes it while a send runs: the answer, or its error, needs the form
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onOpenChange={(next) => (next || !busy) && onOpenChange(next)}>
      {open && (
        <ModalContent
          size={560}
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            opener.current?.focus()
          }}
        >
          <ModalHeader title={t('title')} closeLabel={t('close')} />
          <AddMemberSteps
            slug={slug}
            people={people}
            menu={menu}
            initial={initial}
            onBusy={setBusy}
            onDone={() => {
              setBusy(false)
              onOpenChange(false)
            }}
            onLink={onLink}
          />
        </ModalContent>
      )}
    </Modal>
  )
}

function AddMemberSteps({
  slug,
  people,
  menu,
  onBusy,
  onDone,
  onLink,
  initial = emptyInvite,
}: {
  slug: string
  people: TeamMember[]
  menu: Menu
  initial?: InviteForm
  onBusy: (busy: boolean) => void
  onDone: () => void
  onLink: (name: string, url: string) => void
}) {
  const t = useTranslations('settings.team.add')
  // the same words as the wizard's team step (B-Onboarding and B-Team share them)
  const words = useTranslations('setup.team')
  const levels = useTranslations('levels')
  const format = useFormatter()
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const id = useId()
  const invite = useMutation(sdk.team.sendInvite(slug))
  const phoneOnly = useMutation(sdk.team.addPhoneOnly(slug))
  const [form, setForm] = useState<InviteForm>(initial)
  const [step, setStep] = useState(0)
  const [now] = useState(() => Date.now())
  const body = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const change = (patch: Partial<InviteForm>) => setForm((f) => ({ ...f, ...patch }))
  const goTo = (next: number) => {
    moved.current = true
    setStep(next)
  }

  // a step moved to is announced from its start (opening leaves the focus to the dialog)
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    body.current?.focus()
  }, [step])

  const app = usesApp(form)
  const problem = phoneProblem(form.phone, app, people, now)
  const services = menu.groups.flatMap((g) => g.services)
  const ok = [whoDone(form, problem), servicesDone(form, services.length > 0), true]
  const specialist = form.level === 'specialist'
  const name = form.name.trim()
  const mobile = isMobile(form.phone)
  const masked = mobile ? maskPhone(form.phone) : t('thisNumber')
  const until = fmt.dayMonth(today(inviteExpiresAt(now)))
  const busy = invite.isPending || phoneOnly.isPending
  const picked = services.filter((s) => form.serviceIds.includes(s.id))

  const appCaption = !specialist
    ? t('adminApp', { phone: masked, days: INVITE_DAYS })
    : form.hasApp
      ? t('appOn', { phone: masked, days: INVITE_DAYS })
      : t('appOff')
  const phoneError =
    problem === 'notMobile'
      ? words('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
      : problem && t(`problems.${problem}`)

  const send = async () => {
    if (busy || !ok[0] || !ok[1]) return
    const input = inviteInput(form, locale)
    onBusy(true)
    try {
      if (app) {
        const sent = await invite.mutateAsync(input)
        const end = sent.member.invite ? fmt.dayMonth(today(sent.member.invite.expiresAt)) : until
        toast(t('sent', { name, date: end }), { action: { label: t('copyLink'), onClick: () => onLink(name, sent.link) } })
      } else {
        const { level: _, ...person } = input
        await phoneOnly.mutateAsync(person)
        toast(form.serviceIds.length > 0 ? t('added', { name }) : t('addedPlain', { name }))
      }
      onDone()
    } catch (error) {
      onBusy(false)
      toast(errorText(error))
    }
  }

  const summary = [
    { key: t('summary.phone'), value: mobile ? formatPhone(form.phone) : '', step: 0 },
    { key: t('summary.name'), value: name, step: 0 },
    { key: t('summary.fullName'), value: form.fullName.trim() || t('dash'), step: 0 },
    { key: t('summary.specialization'), value: form.specialization.trim() || t('dash'), step: 0 },
    { key: t('summary.level'), value: levels(form.level), step: 0 },
    { key: t('summary.usesApp'), value: app ? t('yes') : t('no'), step: 0 },
    {
      key: t('summary.services'),
      value: picked.length
        ? t('servicesList', { n: picked.length, names: format.list(picked.map((s) => localized(s.name, locale))) })
        : t('none'),
      step: 1,
    },
  ]

  return (
    <>
      <ol aria-label={t('stepsLabel')} className="m-0 flex list-none flex-wrap items-center gap-2.5 border-b border-n-200 p-0 pb-4">
        {STEPS.map((s, i) => {
          const cur = i === step
          const done = i < step
          return (
            <li key={s} className="flex items-center gap-2.5">
              {i > 0 && <span aria-hidden className="h-px w-5 flex-none bg-n-300" />}
              <button
                type="button"
                disabled={!done || busy}
                aria-current={cur ? 'step' : undefined}
                onClick={() => goTo(i)}
                className={cn(
                  'group inline-flex min-h-8 items-center gap-2 rounded-input border-0 bg-transparent py-0 pr-1.5 pl-0.5 text-left text-small font-medium text-n-500',
                  'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default',
                  done && 'cursor-pointer text-n-900',
                  cur && 'font-semibold text-n-900',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-6 flex-none items-center justify-center rounded-pill border border-n-300 text-micro font-bold text-n-500',
                    cur && 'border-n-900 bg-n-900 text-white',
                    done && 'border-a-line bg-a-50 text-a-600',
                  )}
                >
                  {done ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                {/* phones keep only the current step's name */}
                <span className={cn(!cur && 'max-sm:sr-only', done && 'group-hover:underline')}>{t(`steps.${s}`)}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div ref={body} tabIndex={-1} className="flex flex-col gap-4 outline-none">
        {step === 0 && (
          <>
            <Field label={t('phone')} hint={words('phoneNeeded')} error={phoneError}>
              <PhoneInput {...PHONE_RULES} value={form.phone} onValueChange={(phone) => change({ phone })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('name')}>
                <Input
                  value={form.name}
                  maxLength={TEAM_NAME_MAX}
                  placeholder={t('namePlaceholder')}
                  onChange={(e) => change({ name: e.target.value })}
                />
              </Field>
              <Field label={t('specialization')} optional={t('optional')}>
                <Input
                  value={form.specialization}
                  maxLength={SPECIALIZATION_MAX}
                  placeholder={t('specializationPlaceholder')}
                  onChange={(e) => change({ specialization: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('fullName')} optional={t('optional')} hint={t('fullNameHint')}>
              <Input
                value={form.fullName}
                maxLength={FULL_NAME_MAX}
                placeholder={t('fullNamePlaceholder')}
                onChange={(e) => change({ fullName: e.target.value })}
              />
            </Field>
            <Field label={t('level')}>
              <Select value={form.level} onChange={(e) => change({ level: e.target.value === 'admin' ? 'admin' : 'specialist' })}>
                <option value="specialist">{levels('specialist')}</option>
                <option value="admin">{levels('admin')}</option>
              </Select>
            </Field>
            <p className="m-0 -mt-2 flex items-start gap-2 rounded-s bg-group px-3 py-2.5 text-dense text-n-600">
              <Info aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.75} />
              {words(form.level === 'admin' ? 'adminMeans' : 'specialistMeans')}
            </p>
            {specialist ? (
              <div className="flex min-h-15 items-center justify-between gap-4 py-1.5">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span id={`${id}-app`} className="text-body font-medium text-n-900">
                    {t('usesApp')}
                  </span>
                  <span id={`${id}-app-cap`} className="text-dense text-n-600">
                    {appCaption}
                  </span>
                </span>
                <Switch
                  checked={form.hasApp}
                  aria-labelledby={`${id}-app`}
                  aria-describedby={`${id}-app-cap`}
                  onCheckedChange={(hasApp) => change({ hasApp })}
                />
              </div>
            ) : (
              <span className="text-dense text-n-600">{appCaption}</span>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">{t('question', { name })}</h3>
              <span className="text-dense text-n-600">{specialist ? t('servicesHintSpecialist', { name }) : t('servicesHintAdmin')}</span>
            </div>
            {services.length === 0 ? (
              <p className="m-0 text-dense text-n-600">{t('noServices')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <ServicePicker menu={menu} selected={form.serviceIds} onChange={(serviceIds) => change({ serviceIds })} />
                <span className="text-dense font-semibold text-n-900">
                  {form.serviceIds.length ? t('selected', { n: form.serviceIds.length }) : t('noneSelected')}
                </span>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col border-t border-n-200">
              {summary.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  disabled={busy}
                  aria-label={t('changeAria', { key: r.key, value: r.value })}
                  onClick={() => goTo(r.step)}
                  className="grid w-full cursor-pointer grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3 border-0 border-b border-n-200 bg-transparent px-2 py-3 text-left text-small text-n-900 hover:bg-n-50 focus-visible:shadow-focus-inset focus-visible:outline-none sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                >
                  <span className="text-n-600">{r.key}</span>
                  <span className="min-w-0 font-semibold">{r.value}</span>
                  <span className="text-dense font-semibold text-a-600">{t('change')}</span>
                </button>
              ))}
            </div>
            <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
              <Lock aria-hidden className="mt-px size-4.5 flex-none" strokeWidth={1.75} />
              {app ? t('noteApp', { phone: masked, days: INVITE_DAYS, date: until }) : t('noteNoApp', { name })}
            </p>
          </>
        )}
      </div>

      <ModalActions>
        {step === 0 ? (
          <Button variant="secondary" onClick={onDone}>
            {t('cancel')}
          </Button>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => goTo(step - 1)}>
            {t('back')}
          </Button>
        )}
        {step < 2 ? (
          <Button variant="primary" disabled={!ok[step]} onClick={() => goTo(step + 1)}>
            {t('continue')}
          </Button>
        ) : (
          <Button variant="primary" loading={busy} loadingLabel={t('sending')} onClick={send}>
            {app ? t('sendInvite') : t('addToTeam')}
          </Button>
        )}
      </ModalActions>
    </>
  )
}
