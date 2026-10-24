import { REQUEST_ANSWERERS, BUFFER_MAX, LATE_MINUTES, type RequestAnswerers } from '@yeral/domain/rules'
import type { ConfirmMode } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { Callout } from '@yeral/ui/callout'
import { FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { NumberStepper } from '@yeral/ui/number-stepper'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Select } from '@yeral/ui/select'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { SettingsRow } from '@yeral/ui/settings-row'
import { Switch } from '@yeral/ui/switch'
import { Info, Lock } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { choicesWith } from '@/shared/lib'
import { ANSWERER_KEY, useRuleLabels } from '../lib/labels'
import { BUFFER_CHOICES, bufferIsOther, LEAD_CHOICES, NO_SHOW_MAX, STEP_CHOICES, WINDOW_CHOICES } from '../model/rules'
import type { RulesFormState } from '../model/use-rules-form'
import { CancelSelect, HoldSelect } from './rule-selects'

/** The buffer select's value for «Other…». */
const OTHER = 'other'

/** What «Other…» starts from when a preset was chosen (B-Settings `bufCustom: '25'`). */
const OTHER_START = 25

/** The first free times the time-step caption shows («10:00, 10:15, 10:30…»). */
const EXAMPLE_START = 10 * 60

/**
 * Settings → Booking rules (B-Settings `isRules`, design §8 and §28.5, book B-05, B-41, B-42): confirmation (and the
 * note that waiting requests keep their timers once it changes), the hold and who answers in manual mode, when clients
 * can book (notice, how far ahead, the buffer with «Other…» 1–120, the time step), and cancelling, lateness and
 * no-shows. `bufferNote` goes under the buffer's help (the services with a buffer of their own). The page around it
 * gives the header, the paused note, the save bar and the client's preview; the internal statuses are their own piece.
 * Every control waits while a save is on its way.
 */
export function BookingRulesForm({ rules, bufferNote }: { rules: RulesFormState; bufferNote?: ReactNode }) {
  const t = useTranslations('bookingRules')
  const tc = useTranslations('common')
  const fmt = useFmt()
  const label = useRuleLabels()
  const { form, set, saving } = rules
  const manual = form.confirmMode === 'manual'
  const other = bufferIsOther(form)
  const bufferBad = rules.bufferInvalid
  const select = 'min-w-44'
  const examples = [0, 1, 2].map((i) => fmt.time(EXAMPLE_START + i * form.slotStep)).join(', ')

  return (
    <div className="flex flex-col">
      <Section title={t('confirmation')}>
        <SettingsRow layout="stacked" label={t('mode')} description={t('modeHint')}>
          {({ id, labelId, descriptionId }) => (
            <OptionCardGroup
              id={id}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              disabled={saving}
              value={form.confirmMode}
              onValueChange={(confirmMode) => set({ confirmMode: confirmMode as ConfirmMode })}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3"
            >
              <OptionCard value="manual" indicator="start" title={t('manual')} caption={t('manualCaption')} />
              <OptionCard value="instant" indicator="start" title={t('instant')} caption={t('instantCaption')} />
            </OptionCardGroup>
          )}
        </SettingsRow>
        {rules.modeChanged && (
          <Callout tone="neutral" icon={<Info aria-hidden strokeWidth={1.75} />} live>
            {t('modeChanged')}
          </Callout>
        )}
        {manual && (
          <SettingsRow label={t('hold')} description={t('holdHint')}>
            <HoldSelect
              size="m"
              className={select}
              disabled={saving}
              value={form.holdMinutes}
              onValueChange={(holdMinutes) => set({ holdMinutes })}
            />
          </SettingsRow>
        )}
      </Section>

      {rules.askWho && (
        <Section title={t('who')} description={t('whoHint')}>
          {({ titleId, descriptionId }) => (
            <>
              <OptionCardGroup
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                disabled={saving}
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
        </Section>
      )}

      <Section title={t('when')}>
        <SettingsRow label={t('lead')} description={t('leadHint')}>
          <Select
            size="m"
            className={select}
            disabled={saving}
            value={form.leadMinutes}
            onChange={(e) => set({ leadMinutes: Number(e.target.value) })}
          >
            {choicesWith(LEAD_CHOICES, form.leadMinutes).map((m) => (
              <option key={m} value={m}>
                {label.lead(m)}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={t('window')} description={t('windowHint')}>
          <Select
            size="m"
            className={select}
            disabled={saving}
            value={form.windowDays}
            onChange={(e) => set({ windowDays: Number(e.target.value) })}
          >
            {choicesWith(WINDOW_CHOICES, form.windowDays).map((d) => (
              <option key={d} value={d}>
                {label.window(d)}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow
          label={t('buffer')}
          description={
            bufferNote ? (
              <>
                {t('bufferHint')}
                <span className="block pt-1">{bufferNote}</span>
              </>
            ) : (
              t('bufferHint')
            )
          }
        >
          {({ id, descriptionId }) => (
            <>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Select
                  size="m"
                  id={id}
                  className={select}
                  disabled={saving}
                  value={other ? OTHER : form.bufferMinutes}
                  onChange={(e) =>
                    e.target.value === OTHER
                      ? set({ bufferOther: String(OTHER_START) })
                      : set({ bufferMinutes: Number(e.target.value), bufferOther: null })
                  }
                >
                  {BUFFER_CHOICES.map((m) => (
                    <option key={m} value={m}>
                      {label.buffer(m)}
                    </option>
                  ))}
                  <option value={OTHER}>{t('bufferOther')}</option>
                </Select>
                {other && (
                  <span className="inline-flex items-center gap-2">
                    <Input
                      id={`${id}-other`}
                      inputMode="numeric"
                      aria-label={t('bufferMinutes')}
                      aria-describedby={[descriptionId, bufferBad && `${id}-other-error`].filter(Boolean).join(' ') || undefined}
                      invalid={bufferBad}
                      disabled={saving}
                      value={form.bufferOther ?? String(form.bufferMinutes)}
                      // whole minutes only, up to three figures (B-Settings `onBufCustom`)
                      onChange={(e) => set({ bufferOther: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      className="h-11 w-18 text-center text-small"
                    />
                    <span className="text-dense text-n-600">{t('minutesUnit')}</span>
                  </span>
                )}
              </div>
              {bufferBad && <FieldMessage id={`${id}-other-error`}>{t('bufferRange', { max: BUFFER_MAX })}</FieldMessage>}
            </>
          )}
        </SettingsRow>
        <SettingsRow label={t('step')} description={t('stepHint', { times: examples })}>
          {({ labelId, descriptionId }) => (
            <Segmented
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              disabled={saving}
              value={String(form.slotStep)}
              onValueChange={(v) => set({ slotStep: Number(v) })}
            >
              {STEP_CHOICES.map((m) => (
                <SegmentedItem key={m} value={String(m)}>
                  {fmt.duration(m)}
                </SegmentedItem>
              ))}
            </Segmented>
          )}
        </SettingsRow>
      </Section>

      <Section title={t('cancelling')}>
        <SettingsRow label={t('cancel')} description={t('cancelHint')}>
          <CancelSelect
            size="m"
            className={select}
            disabled={saving}
            value={form.cancelWindowMinutes}
            onValueChange={(cancelWindowMinutes) => set({ cancelWindowMinutes })}
          />
        </SettingsRow>
        <SettingsRow label={t('reason')} description={t('reasonHint')}>
          {({ id, labelId, descriptionId }) => (
            <Switch
              id={id}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              disabled={saving}
              checked={form.askCancelReason}
              onCheckedChange={(askCancelReason) => set({ askCancelReason })}
            />
          )}
        </SettingsRow>
        <SettingsRow label={t('late', { time: fmt.duration(LATE_MINUTES) })} description={t('lateHint', { brand: tc('brand') })}>
          <span className="inline-flex h-7 flex-none items-center gap-1.5 rounded-pill border border-n-200 bg-n-50 px-2.5 text-dense font-semibold whitespace-nowrap text-n-600">
            <Lock aria-hidden strokeWidth={2} className="size-3.5" />
            {t('fixed')}
          </span>
        </SettingsRow>
        <SettingsRow
          label={t('noShows')}
          description={form.blockAfterNoShows === 0 ? t('noShowsOffHint') : t('noShowsHint', { n: form.blockAfterNoShows })}
        >
          {({ labelId, descriptionId }) => (
            <NumberStepper
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              wide
              disabled={saving}
              min={0}
              max={NO_SHOW_MAX}
              value={form.blockAfterNoShows}
              onValueChange={(blockAfterNoShows) => set({ blockAfterNoShows })}
              format={label.noShows}
              decreaseLabel={t('fewer')}
              increaseLabel={t('more')}
            />
          )}
        </SettingsRow>
      </Section>
    </div>
  )
}

/**
 * One group of rules (B-Settings `.ps`, Settings' `SettingsSection`), named by its heading; its caption, when there is
 * one, also describes the control the group is (`ids` for «Who answers requests?»).
 */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode | ((ids: { titleId: string; descriptionId?: string }) => ReactNode)
}) {
  const titleId = useId()
  const descriptionId = description ? `${titleId}-help` : undefined
  return (
    <SettingsSection aria-labelledby={titleId}>
      <div className="flex flex-col gap-0.5">
        <SettingsSectionTitle id={titleId}>{title}</SettingsSectionTitle>
        {description && (
          <p id={descriptionId} className="m-0 text-dense text-n-600">
            {description}
          </p>
        )}
      </div>
      {typeof children === 'function' ? children({ titleId, descriptionId }) : children}
    </SettingsSection>
  )
}
