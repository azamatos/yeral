import { useMutation, useQuery } from '@tanstack/react-query'
import { MARKET } from '@yeral/domain/market'
import { formatPhone, maskPhone } from '@yeral/domain/phone'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Input } from '@yeral/ui/input'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { Info, Plus, User, Users, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { SETUP_TEAM_MAX } from '@yeral/contract/setup'
import { useSdk } from '@/shared/api'
import { TEAM_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import {
  emptyRow,
  formFrom,
  isFilled,
  rowProblem,
  sameTeam,
  teamHint,
  teamInput,
  usesApp,
  type TeamForm,
  type TeamRow,
} from '../model/team'
import { StepHeader, type StepAction } from './setup-frame'

/**
 * Step 6, «Who do you work with?» (B-Onboarding `isTeamStep`, book B-04): «I work alone» or «I have a team» with a row
 * per person (name, phone, access level, and for a specialist whether they use the app). Its `save` sends the whole
 * team in one go (`PUT …/setup/team`); the invites go out when the setup finishes, each seen at sign-in with that
 * number. A hook, as the other steps are, so the wizard's frame stays one element; `on` while the step shows.
 */
export function useTeamStep(slug: string, on: boolean, owner: { name: string; phone: string }): { body: ReactNode; action: StepAction } {
  const t = useTranslations('setup.team')
  const sdk = useSdk()
  const errorText = useErrorText()
  const team = useQuery({ ...sdk.team.list(slug), enabled: on })
  const save = useMutation(sdk.setup.team(slug))
  const [state, setState] = useState<{ form: TeamForm; stored: TeamForm } | null>(null)
  if (on && !state && team.data) {
    const form = formFrom(team.data.items)
    setState({ form, stored: form })
  }
  const form = state?.form
  const set = (change: (f: TeamForm) => TeamForm) => setState((s) => s && { ...s, form: change(s.form) })

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && !form && team.isError) throw team.error
  if (!on || !state || !form)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      action: { valid: false, busy: false, ready: false, save: () => Promise.resolve(true) },
    }

  const hint = teamHint(form, owner.phone)
  const saving = save.isPending

  /** The team into the draft when it changed; false when it failed (the person heard why). */
  const saveTeam = async (): Promise<boolean> => {
    if (sameTeam(form, state.stored)) return true
    // leaving with a row half filled would drop the step's edits: the person hears what to fix and stays
    if (hint) {
      toast(t(hint, { digits: MARKET.phone.length }))
      return false
    }
    try {
      const saved = await save.mutateAsync(teamInput(form))
      // the rows keep their keys; what's stored is what the api has now
      setState((s) => s && { ...s, stored: formFrom(saved.items) })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const pick = (solo: boolean) => set((f) => ({ solo, rows: !solo && !f.rows.some(isFilled) ? [emptyRow()] : f.rows }))

  const body = (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="team" title={t('title')} lead={t('lead')} />
      <OptionCardGroup
        aria-label={t('choice')}
        value={form.solo ? 'solo' : 'team'}
        disabled={saving}
        onValueChange={(v) => pick(v === 'solo')}
        className="grid grid-cols-2 gap-4 max-md:grid-cols-1"
      >
        <OptionCard value="solo" size="l" icon={<User aria-hidden strokeWidth={1.75} />} title={t('solo')} caption={t('soloCaption')} />
        <OptionCard value="team" size="l" icon={<Users aria-hidden strokeWidth={1.75} />} title={t('team')} caption={t('teamCaption')} />
      </OptionCardGroup>
      {form.solo ? (
        <Callout tone="neutral" icon={<Info aria-hidden strokeWidth={1.75} />}>
          {t('soloNote')}
        </Callout>
      ) : (
        <TeamRows form={form} owner={owner} disabled={saving} onChange={set} />
      )}
    </section>
  )
  return {
    body,
    action: {
      valid: !hint,
      hint: hint ? t(hint, { digits: MARKET.phone.length }) : undefined,
      busy: saving,
      ready: true,
      save: saveTeam,
    },
  }
}

const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_210px_168px_44px] items-center gap-2 max-md:grid-cols-[minmax(0,1fr)_44px]'

function TeamRows({
  form,
  owner,
  disabled,
  onChange,
}: {
  form: TeamForm
  owner: { name: string; phone: string }
  disabled: boolean
  onChange: (change: (f: TeamForm) => TeamForm) => void
}) {
  const t = useTranslations('setup.team')
  // where the focus goes once the list has changed: a new row's name; after a removal the next row's (else the one
  // before, else «Add a team member»), so it never falls back to the page
  const [focusNext, setFocusNext] = useState<{ row: string } | 'add' | null>(null)
  const names = useRef(new Map<string, HTMLInputElement>())
  const addButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!focusNext) return
    if (focusNext === 'add') addButton.current?.focus()
    else names.current.get(focusNext.row)?.focus()
  }, [focusNext])
  const update = (key: string, patch: Partial<TeamRow>) =>
    onChange((f) => ({ ...f, rows: f.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))
  const remove = (key: string) => {
    const at = form.rows.findIndex((r) => r.key === key)
    const next = (form.rows[at + 1] ?? form.rows[at - 1])?.key
    setFocusNext(next ? { row: next } : 'add')
    onChange((f) => ({ ...f, rows: f.rows.filter((r) => r.key !== key) }))
  }
  const add = () => {
    const row = emptyRow()
    setFocusNext({ row: row.key })
    onChange((f) => ({ ...f, rows: [...f.rows, row] }))
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <div aria-hidden className={`${COLUMNS} pb-2 text-label text-n-500 max-md:hidden`}>
          <span>{t('name')}</span>
          <span>{t('phone')}</span>
          <span>{t('level')}</span>
          <span />
        </div>
        <div className={`${COLUMNS} border-t border-n-200 py-2`}>
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={owner.name} size={32} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-semibold">{owner.name}</span>
              <span className="text-small text-n-600">{t('you')}</span>
            </span>
          </span>
          <span className="text-small whitespace-nowrap text-n-600 max-md:col-span-2 max-md:row-start-2">{formatPhone(owner.phone)}</span>
          <span className="pl-3 text-small font-semibold max-md:col-span-2 max-md:row-start-3 max-md:pl-0">{t('owner')}</span>
          <span className="max-md:col-start-2 max-md:row-start-1" />
        </div>
        {form.rows.map((row, i) => (
          <MemberRow
            key={row.key}
            nameRef={(input) => {
              if (input) names.current.set(row.key, input)
              else names.current.delete(row.key)
            }}
            index={i + 1}
            row={row}
            problem={isFilled(row) ? rowProblem(row, form.rows, owner.phone) : null}
            disabled={disabled}
            onChange={(patch) => update(row.key, patch)}
            onRemove={() => remove(row.key)}
          />
        ))}
      </div>
      {form.rows.length < SETUP_TEAM_MAX && (
        <button
          ref={addButton}
          type="button"
          disabled={disabled}
          onClick={add}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-m border border-dashed border-n-300 bg-n-0 text-body font-semibold text-a-600 hover:border-n-400 hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default disabled:text-n-500"
        >
          <Plus aria-hidden strokeWidth={2} className="size-4.5" />
          {t('add')}
        </button>
      )}
      <p className="text-dense text-n-600">{t('phoneNote')}</p>
      <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-dense max-md:grid-cols-1 max-md:gap-y-1">
        <dt className="font-semibold">{t('specialist')}</dt>
        <dd className="text-n-600 max-sm:mb-2">{t('specialistMeans')}</dd>
        <dt className="font-semibold">{t('admin')}</dt>
        <dd className="text-n-600 max-sm:mb-2">{t('adminMeans')}</dd>
        <dt className="font-semibold">{t('appOff')}</dt>
        <dd className="text-n-600">{t('appOffMeans')}</dd>
      </dl>
      <p className="text-dense text-n-600">{t('permissions')}</p>
    </div>
  )
}

function MemberRow({
  nameRef,
  index,
  row,
  problem,
  disabled,
  onChange,
  onRemove,
}: {
  /** The name field, for the list to move the focus there. */
  nameRef: (input: HTMLInputElement | null) => void
  index: number
  row: TeamRow
  problem: ReturnType<typeof rowProblem>
  disabled: boolean
  onChange: (patch: Partial<TeamRow>) => void
  onRemove: () => void
}) {
  const t = useTranslations('setup.team')
  const format = useFormatter()
  const id = useId()
  const who = row.name.trim() || t('newMember')
  const app = usesApp(row)
  const complete = row.phone.length === MARKET.phone.length
  const caption =
    problem === 'notMobile'
      ? t('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
      : problem === 'taken'
        ? t('taken')
        : !complete
          ? t('phoneNeeded')
          : app
            ? t('invited', { phone: maskPhone(row.phone) })
            : t('noApp')
  const error = problem === 'notMobile' || problem === 'taken'
  return (
    <div role="group" aria-label={t('member', { n: index, name: who })} className="flex flex-col gap-2 border-t border-n-200 py-2">
      <div className={COLUMNS}>
        <Input
          ref={nameRef}
          className="h-11 text-small max-sm:text-[16px]"
          aria-label={t('nameOf', { n: index })}
          placeholder={t('name')}
          value={row.name}
          maxLength={TEAM_NAME_MAX}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <PhoneInput
          size={44}
          className="max-md:col-span-2 max-md:row-start-2"
          {...PHONE_RULES}
          aria-label={t('phoneOf', { name: who })}
          aria-describedby={`${id}-cap`}
          invalid={error}
          value={row.phone}
          disabled={disabled}
          onValueChange={(phone) => onChange({ phone })}
        />
        <Select
          size="m"
          className="w-full max-md:col-span-2 max-md:row-start-3"
          aria-label={t('levelOf', { name: who })}
          value={row.level}
          disabled={disabled}
          onChange={(e) => onChange({ level: e.target.value === 'admin' ? 'admin' : 'specialist' })}
        >
          <option value="specialist">{t('specialist')}</option>
          <option value="admin">{t('admin')}</option>
        </Select>
        <Button variant="ghost" size="m" iconOnly aria-label={t('remove', { name: who })} disabled={disabled} onClick={onRemove}>
          <X aria-hidden strokeWidth={1.75} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {row.level === 'specialist' && (
          <span className="inline-flex items-center gap-2">
            <Switch
              id={`${id}-app`}
              checked={row.hasApp}
              disabled={disabled}
              onCheckedChange={(hasApp) => onChange({ hasApp })}
              aria-describedby={`${id}-cap`}
            />
            <label htmlFor={`${id}-app`} className="text-small font-semibold">
              {t('usesApp')}
            </label>
          </span>
        )}
        <span id={`${id}-cap`} aria-live="polite" className={error ? 'text-dense text-danger-ink' : 'text-dense text-n-600'}>
          {caption}
        </span>
      </div>
    </div>
  )
}
