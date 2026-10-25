import { useMutation } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import { localized } from '@yeral/domain/model'
import { formatPhone, maskPhone, toE164 } from '@yeral/domain/phone'
import { INVITE_DAYS } from '@yeral/domain/team'
import { today } from '@yeral/domain/time'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { cn } from '@yeral/ui/cn'
import { Check, Info, Lock } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useFormatter, useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { TEAM_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { emptyInvite, inviteInput, phoneProblem, servicesDone, usesApp, whoDone, type InviteForm } from '../model/invite'

const SPECIALIZATION_MAX = 60
const STEPS = ['who', 'services', 'review'] as const

/**
 * «Add a team member» (B-Team `inv`, design §8 «Topar», §28.4 Team; owner only): 1 Who (the mobile number, the name
 * clients see, the specialization, the access level, a specialist's «Uses the app»), 2 Services (in the menu's groups,
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
  onLink,
}: {
  slug: string
  people: TeamMember[]
  menu: Menu
  open: boolean
  onOpenChange: (open: boolean) => void
  onLink: (name: string, url: string) => void
}) {
  const t = useTranslations('settings.team.add')
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {open && (
        <ModalContent size={560}>
          <ModalHeader title={t('title')} closeLabel={t('close')} />
          <AddMemberSteps slug={slug} people={people} menu={menu} onDone={() => onOpenChange(false)} onLink={onLink} />
        </ModalContent>
      )}
    </Modal>
  )
}

function AddMemberSteps({
  slug,
  people,
  menu,
  onDone,
  onLink,
}: {
  slug: string
  people: TeamMember[]
  menu: Menu
  onDone: () => void
  onLink: (name: string, url: string) => void
}) {
  const t = useTranslations('settings.team.add')
  const levels = useTranslations('levels')
  const format = useFormatter()
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const id = useId()
  const invite = useMutation(sdk.team.sendInvite(slug))
  const phoneOnly = useMutation(sdk.team.addPhoneOnly(slug))
  const [form, setForm] = useState<InviteForm>(emptyInvite)
  const [step, setStep] = useState(0)
  const [now] = useState(() => Date.now())
  const body = useRef<HTMLDivElement>(null)
  const opened = useRef(false)
  const change = (patch: Partial<InviteForm>) => setForm((f) => ({ ...f, ...patch }))

  // a new step is announced from its start (not on opening: the dialog takes the focus then)
  useEffect(() => {
    if (opened.current) body.current?.focus()
    opened.current = true
  }, [step])

  const problem = phoneProblem(form.phone, people, now)
  const services = menu.groups.flatMap((g) => g.services)
  const ok = [whoDone(form, problem), servicesDone(form, services.length > 0), true]
  const app = usesApp(form)
  const specialist = form.level === 'specialist'
  const name = form.name.trim()
  const complete = form.phone.length === MARKET.phone.length
  const masked = complete ? maskPhone(form.phone) : t('thisNumber')
  const until = fmt.dayMonth(today(now + INVITE_DAYS * 86_400_000))
  const busy = invite.isPending || phoneOnly.isPending
  const picked = services.filter((s) => form.serviceIds.includes(s.id))

  const appCaption = !specialist
    ? t('adminApp', { phone: masked, days: INVITE_DAYS })
    : form.hasApp
      ? t('appOn', { phone: masked, days: INVITE_DAYS })
      : t('appOff')
  const phoneError =
    problem === 'notMobile'
      ? t('problems.notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
      : problem && t(`problems.${problem}`)

  const send = async () => {
    if (busy) return
    const input = inviteInput(form, locale)
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
      toast(errorText(error))
    }
  }

  const summary = [
    { key: t('summary.phone'), value: complete ? formatPhone(toE164(form.phone)) : '', step: 0 },
    { key: t('summary.name'), value: name, step: 0 },
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
                onClick={() => setStep(i)}
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
            <Field label={t('phone')} hint={t('phoneHint')} error={phoneError}>
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
            <Field label={t('level')}>
              <Select value={form.level} onChange={(e) => change({ level: e.target.value === 'admin' ? 'admin' : 'specialist' })}>
                <option value="specialist">{levels('specialist')}</option>
                <option value="admin">{levels('admin')}</option>
              </Select>
            </Field>
            <p className="m-0 -mt-2 flex items-start gap-2 rounded-s bg-group px-3 py-2.5 text-dense text-n-600">
              <Info aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.75} />
              {t(`levelMeans.${form.level}`)}
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
                {menu.groups
                  .filter((g) => g.services.length > 0)
                  .map((g) => (
                    <ServiceGroup
                      key={g.id}
                      name={localized(g.name, locale)}
                      items={g.services.map((s) => ({
                        id: s.id,
                        name: localized(s.name, locale),
                        meta: t('meta', {
                          duration: fmt.duration(s.durationMin),
                          price: fmt.price({ type: s.priceType, amount: s.priceAmount }),
                        }),
                      }))}
                      selected={form.serviceIds}
                      onChange={(serviceIds) => change({ serviceIds })}
                    />
                  ))}
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
                  onClick={() => setStep(r.step)}
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
          <Button variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>
            {t('back')}
          </Button>
        )}
        {step < 2 ? (
          <Button variant="primary" disabled={!ok[step]} onClick={() => setStep(step + 1)}>
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

/** A menu group's services with «All» (B-Team `.sgrp`): checked, cleared, or some of them (mixed). */
function ServiceGroup({
  name,
  items,
  selected,
  onChange,
}: {
  name: string
  items: { id: string; name: string; meta: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const t = useTranslations('settings.team.add')
  const headingId = useId()
  const ids = items.map((i) => i.id)
  const n = ids.filter((i) => selected.includes(i)).length
  const all = n === ids.length
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col border-b border-n-200 pb-2">
      <div className="flex min-h-12 items-center gap-2">
        <span id={headingId} className="text-small font-bold text-n-900">
          {name}
        </span>
        <span className="text-dense text-n-600">{t('groupCount', { n, total: ids.length })}</span>
        <label className="-mr-2.5 ml-auto inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-input px-2.5 text-dense font-semibold text-n-900 hover:bg-group">
          <Checkbox
            aria-label={t('allAria', { group: name })}
            checked={all}
            // some of them: the box shows a dash and is read as mixed
            ref={(el) => {
              if (el) el.indeterminate = n > 0 && !all
            }}
            onChange={() =>
              onChange(all ? selected.filter((i) => !ids.includes(i)) : [...selected, ...ids.filter((i) => !selected.includes(i))])
            }
          />
          {t('all')}
        </label>
      </div>
      {items.map((item) => (
        <label key={item.id} className="-mx-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-s px-2 py-1.5 hover:bg-n-50">
          <Checkbox
            checked={selected.includes(item.id)}
            onChange={() => onChange(selected.includes(item.id) ? selected.filter((i) => i !== item.id) : [...selected, item.id])}
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-body text-n-900">{item.name}</span>
            <span className="text-dense text-n-600">{item.meta}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
