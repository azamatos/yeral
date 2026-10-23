import { useMutation, useQuery } from '@tanstack/react-query'
import type { ConfirmMode } from '@yeral/domain/model'
import { REQUEST_ANSWERERS, type RequestAnswerers } from '@yeral/domain/rules'
import { useFmt } from '@yeral/i18n'
import { Callout } from '@yeral/ui/callout'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { Select } from '@yeral/ui/select'
import { SettingsRow } from '@yeral/ui/settings-row'
import { Spinner } from '@yeral/ui/spinner'
import { StatusBadge } from '@yeral/ui/status-badge'
import { toast } from '@yeral/ui/toast'
import { Check, Clock, Info, UserCheck, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { BUFFER_CHOICES, CANCEL_CHOICES, choicesWith, formFrom, hasTeam, HOLD_CHOICES, rulesUpdate, type RulesForm } from '../model/rules'
import { StepHeader, type StepAction } from './setup-frame'

const ANSWERER_KEY: Record<RequestAnswerers, 'whoDesk' | 'whoEach' | 'whoBoth'> = { desk: 'whoDesk', each: 'whoEach', both: 'whoBoth' }

/** A select's value for the cancel window: `null` is «Any time». */
const ANY = 'any'

/**
 * Step 7, «How should bookings arrive?» (B-Onboarding `isRules`, book B-05): confirm each booking (the default, with
 * the hold time, and who answers once there's a team, B-42) or confirm at once; the free cancellation window and the
 * buffer after each service. Its `save` sends what changed to the draft's booking rules. A hook, as the address step
 * is, so the wizard's frame stays one element; `on` while the step shows.
 */
export function useRulesStep(slug: string, on: boolean): { body: ReactNode; action: StepAction } {
  const t = useTranslations('setup.rules')
  const sdk = useSdk()
  const ts = useTranslations('status')
  const fmt = useFmt()
  const errorText = useErrorText()
  const rules = useQuery({ ...sdk.settings.rules(slug), enabled: on })
  // only «Who answers requests?» needs the team: the step doesn't wait for it, and without it (the api doesn't show a
  // draft's team yet) the question stays hidden and the setting keeps its value
  const team = useQuery({ ...sdk.team.list(slug), enabled: on, retry: false })
  const update = useMutation(sdk.settings.updateRules(slug))
  const [state, setState] = useState<{ form: RulesForm; stored: RulesForm } | null>(null)
  if (on && !state && rules.data) {
    const form = formFrom(rules.data)
    setState({ form, stored: form })
  }
  const form = state?.form
  const set = (change: Partial<RulesForm>) => setState((s) => s && { ...s, form: { ...s.form, ...change } })

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && !form && rules.isError) throw rules.error
  if (!on || !state || !form)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      action: { valid: false, busy: false, ready: false, save: () => Promise.resolve(true) },
    }

  const manual = form.confirmMode === 'manual'
  const askWho = manual && !!team.data && hasTeam(team.data.items)
  // what's chosen while the save is on its way would be left out of it
  const saving = update.isPending

  /** What changed into the draft's rules; false when it failed (the person heard why). */
  const save = async (): Promise<boolean> => {
    const changes = rulesUpdate(form, state.stored)
    if (!changes) return true
    try {
      await update.mutateAsync(changes)
      setState((s) => s && { ...s, stored: form })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const clientSees = (badge: ReactNode) => (
    <span className="inline-flex flex-wrap items-center gap-2 text-dense text-n-600">
      {t('clientSees')}
      {badge}
    </span>
  )
  const row = 'border-t border-n-200 py-5'
  // the wizard's selects are 220 wide (B-Onboarding `.srow`)
  const select = 'w-55'

  const body = (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="rules" title={t('title')} lead={t('lead')} />
      <OptionCardGroup
        aria-label={t('confirmation')}
        value={form.confirmMode}
        disabled={saving}
        onValueChange={(confirmMode) => set({ confirmMode: confirmMode as ConfirmMode })}
        className="grid grid-cols-2 gap-4 max-md:grid-cols-1"
      >
        <OptionCard
          value="manual"
          size="l"
          icon={<UserCheck aria-hidden strokeWidth={1.75} />}
          title={t('manual')}
          tag={t('recommended')}
          caption={t('manualCaption')}
          trailing={clientSees(
            <StatusBadge status="pending" icon={<Clock aria-hidden strokeWidth={2} />}>
              {ts('pending')}
            </StatusBadge>,
          )}
        />
        <OptionCard
          value="instant"
          size="l"
          icon={<Zap aria-hidden strokeWidth={1.75} />}
          title={t('instant')}
          caption={t('instantCaption')}
          trailing={clientSees(
            <StatusBadge status="confirmed" icon={<Check aria-hidden strokeWidth={2} />}>
              {ts('confirmed')}
            </StatusBadge>,
          )}
        />
      </OptionCardGroup>
      <div className="flex flex-col">
        {manual && (
          <SettingsRow label={t('hold')} description={t('holdHint')} className={row}>
            <Select
              className={select}
              disabled={saving}
              value={form.holdMinutes}
              onChange={(e) => set({ holdMinutes: Number(e.target.value) })}
            >
              {choicesWith(HOLD_CHOICES, form.holdMinutes).map((m) => (
                <option key={m} value={m}>
                  {fmt.duration(m)}
                </option>
              ))}
            </Select>
          </SettingsRow>
        )}
        {askWho && (
          <SettingsRow layout="stacked" label={t('who')} description={t('whoHint')} className={row}>
            {({ id, labelId, descriptionId }) => (
              <>
                <OptionCardGroup
                  id={id}
                  disabled={saving}
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  value={form.requestAnswerers}
                  onValueChange={(requestAnswerers) => set({ requestAnswerers: requestAnswerers as RequestAnswerers })}
                  className="gap-2"
                >
                  {REQUEST_ANSWERERS.map((who) => (
                    <OptionCard
                      key={who}
                      value={who}
                      indicator="start"
                      title={t(ANSWERER_KEY[who])}
                      caption={t(`${ANSWERER_KEY[who]}Caption`)}
                    />
                  ))}
                </OptionCardGroup>
                <span className="text-dense text-n-600">{t('whoNote')}</span>
              </>
            )}
          </SettingsRow>
        )}
        {!manual && (
          <Callout tone="neutral" icon={<Info aria-hidden strokeWidth={1.75} />} live className="mt-1 mb-5">
            {t('instantNote')}
          </Callout>
        )}
        <SettingsRow label={t('cancel')} description={t('cancelHint')} className={row}>
          <Select
            className={select}
            disabled={saving}
            value={form.cancelWindowMinutes ?? ANY}
            onChange={(e) => set({ cancelWindowMinutes: e.target.value === ANY ? null : Number(e.target.value) })}
          >
            {choicesWith(CANCEL_CHOICES, form.cancelWindowMinutes).map((m) => (
              <option key={m ?? ANY} value={m ?? ANY}>
                {m === null ? t('cancelAny') : t('cancelBefore', { hours: m / 60 })}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={t('buffer')} description={t('bufferHint')} className={`${row} border-b`}>
          <Select
            className={select}
            disabled={saving}
            value={form.bufferMinutes}
            onChange={(e) => set({ bufferMinutes: Number(e.target.value) })}
          >
            {choicesWith(BUFFER_CHOICES, form.bufferMinutes).map((m) => (
              <option key={m} value={m}>
                {m === 0 ? t('bufferNone') : fmt.duration(m)}
              </option>
            ))}
          </Select>
        </SettingsRow>
      </div>
      <p className="text-dense text-n-600">{t('settingsLater')}</p>
    </section>
  )

  return { body, action: { valid: true, busy: saving, ready: true, save } }
}
