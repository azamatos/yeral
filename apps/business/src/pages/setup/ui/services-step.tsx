import { useMutation, useQuery } from '@tanstack/react-query'
import type { Category } from '@yeral/contract/catalog'
import { MARKET } from '@yeral/domain/market'
import { useFmt } from '@yeral/i18n'
import { Callout } from '@yeral/ui/callout'
import { Checkbox } from '@yeral/ui/checkbox'
import { Input } from '@yeral/ui/input'
import { InputGroup } from '@yeral/ui/input-group'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Info, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { choicesWith } from '../model/rules'
import {
  DURATION_CHOICES,
  formFromMenu,
  formFromStarters,
  pickedCount,
  SERVICE_NAME_MAX,
  servicesInput,
  servicesProblem,
  withNewRow,
  type ServiceRow,
  type ServicesForm,
} from '../model/services'
import { StepHeader, type StepAction } from './setup-frame'

// B-Onboarding `.svr` / `.svh`: the box, the name, 150 for the duration, 132 for the price; on phones the name on a
// line of its own above the duration and the price
const ROW_GRID = 'grid grid-cols-[24px_minmax(0,1fr)_150px_132px] items-center gap-3 max-md:grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)]'

/**
 * Step 5, «Your services» (B-Onboarding `isSvc`, book B-04, F-098): the draft category's starter list in its groups,
 * every row picked, each name, duration and price editable, «Select all» / «Clear» per group, «Add service» into «New
 * services»; a category without a list starts empty. Back at the step it shows the menu saved before. Its `save` sends
 * the whole menu in one call (`PUT …/setup/services`) when it changed or was never saved. A hook, as the other steps
 * are, so the wizard's frame stays one element; `on` while the step shows, `known` once the draft has reached it (the
 * step list's «3 services»).
 */
export function useServicesStep(
  slug: string,
  on: boolean,
  known: boolean,
  category: Pick<Category, 'name' | 'starterGroups'> | null,
): { body: ReactNode; action: StepAction; summary?: string } {
  const t = useTranslations('setup.services')
  const sdk = useSdk()
  const fmt = useFmt()
  const locale = useLocale()
  const errorText = useErrorText()
  const menu = useQuery({ ...sdk.settings.menu(slug), enabled: on || known })
  const save = useMutation(sdk.setup.services(slug))
  const ownName = t('newGroup')
  // what's typed, and the menu as last saved (null: never saved, so Continue makes it)
  const [state, setState] = useState<{ form: ServicesForm; saved: string | null } | null>(null)
  if (on && !state && menu.data && category) {
    const saved = menu.data.groups.some((g) => g.services.length)
    const form = saved ? formFromMenu(menu.data, locale, ownName) : formFromStarters(category.starterGroups)
    setState({ form, saved: saved ? JSON.stringify(servicesInput(form, locale)) : null })
  }
  const form = state?.form
  const summary =
    menu.data && menu.data.groups.some((g) => g.services.length)
      ? t('summary', { count: menu.data.groups.reduce((n, g) => n + g.services.length, 0) })
      : undefined

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && !form && menu.isError) throw menu.error
  if (!on || !state || !form)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      action: { valid: false, busy: false, ready: false, save: () => Promise.resolve(true) },
      summary,
    }

  const saving = save.isPending
  const update = (change: (f: ServicesForm) => ServicesForm) => setState((s) => s && { ...s, form: change(s.form) })
  const setRow = (key: string, patch: Partial<ServiceRow>) =>
    update((f) => ({ ...f, rows: f.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))

  const problem = servicesProblem(form)
  const hint = problem === 'none' ? t('hintNone') : problem === 'name' ? t('hintName') : problem === 'price' ? t('hintPrice') : undefined

  /** The whole menu, when it changed or was never saved; false when it failed (the person heard why). */
  const onSave = async (): Promise<boolean> => {
    if (problem) return true
    const input = servicesInput(form, locale)
    const sent = JSON.stringify(input)
    if (sent === state.saved) return true
    try {
      // the rows as saved, by id from now on: saving again keeps them
      const saved = formFromMenu(await save.mutateAsync(input), locale, ownName)
      setState({ form: saved, saved: JSON.stringify(servicesInput(saved, locale)) })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const count = pickedCount(form)
  const starters = !!category?.starterGroups.length
  const groups = form.groups.filter((g) => form.rows.some((r) => r.group === g.key))

  const body = (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="services" title={t('title')} lead={t('lead')} />
      <div className="flex flex-col">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-3">
          <h2 className="text-[17px] leading-6 font-semibold tracking-[-0.01em]">
            {starters ? t('suggested', { category: category?.name ?? '' }) : t('own')}
          </h2>
          <span role="status" className="text-dense font-semibold text-n-900">
            {t('selected', { count })}
          </span>
        </div>
        {!starters && (
          <Callout tone="neutral" icon={<Info aria-hidden strokeWidth={1.75} />} className="mb-4">
            {t('noStarter')}
          </Callout>
        )}
        {form.rows.length > 0 && (
          <div aria-hidden className={`${ROW_GRID} pb-1 text-label text-n-500 uppercase max-md:hidden`}>
            <span />
            <span className="pl-2.75">{t('columns.service')}</span>
            <span>{t('columns.duration')}</span>
            <span className="text-right">{t('columns.price')}</span>
          </div>
        )}
        {groups.map((g) => {
          const rows = form.rows.filter((r) => r.group === g.key)
          const all = rows.every((r) => r.on)
          const keys = new Set(rows.map((r) => r.key))
          return (
            <section key={g.key} className="flex flex-col">
              <div className="flex items-center justify-between gap-3 pt-5 pb-2">
                <h3 className="text-body font-semibold">{g.name}</h3>
                <button
                  type="button"
                  disabled={saving}
                  className={`${textLink} text-small`}
                  onClick={() => update((f) => ({ ...f, rows: f.rows.map((r) => (keys.has(r.key) ? { ...r, on: !all } : r)) }))}
                >
                  {all ? t('clear') : t('selectAll')}
                </button>
              </div>
              {rows.map((r) => (
                <Row key={r.key} row={r} disabled={saving} onChange={(patch) => setRow(r.key, patch)} fmt={fmt} />
              ))}
            </section>
          )
        })}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => update((f) => withNewRow(f, ownName))}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-m border border-dashed border-n-300 bg-n-0 text-body font-semibold text-a-600 hover:border-n-400 hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default disabled:text-n-500"
      >
        <Plus aria-hidden strokeWidth={2} className="size-4.5" />
        {t('add')}
      </button>
      <p className="text-dense text-n-600">{t('settingsLater')}</p>
    </section>
  )

  return { body, action: { valid: !problem, hint, busy: saving, ready: true, save: onSave }, summary }
}

function Row({
  row: r,
  disabled,
  onChange,
  fmt,
}: {
  row: ServiceRow
  disabled: boolean
  onChange: (patch: Partial<ServiceRow>) => void
  fmt: ReturnType<typeof useFmt>
}) {
  const t = useTranslations('setup.services')
  const name = r.name.trim() || t('unnamed')
  const off = !r.on || disabled
  const from = r.priceType === 'from'
  return (
    <div className={`${ROW_GRID} border-t border-n-200 py-2`}>
      <Checkbox aria-label={t('pick', { name })} checked={r.on} disabled={disabled} onChange={() => onChange({ on: !r.on })} />
      <Input
        aria-label={t('name', { name })}
        placeholder={t('namePlaceholder')}
        value={r.name}
        maxLength={SERVICE_NAME_MAX}
        disabled={off}
        onChange={(e) => onChange({ name: e.target.value })}
        // B-Onboarding `.nm`: the field's line shows on hover and focus only
        className="h-11 border-transparent px-2.5 text-small font-medium hover:border-n-300 focus:border-a-500 disabled:border-transparent disabled:bg-transparent disabled:text-n-500 max-md:col-[2/-1]"
      />
      <Select
        size="m"
        aria-label={t('duration', { name })}
        value={r.durationMin}
        disabled={off}
        onChange={(e) => onChange({ durationMin: Number(e.target.value) })}
        className="max-md:col-2"
      >
        {choicesWith<number>(DURATION_CHOICES, r.durationMin).map((m) => (
          <option key={m} value={m}>
            {fmt.duration(m)}
          </option>
        ))}
      </Select>
      <span className="relative block min-w-0 max-md:col-3">
        {from && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 z-1 flex items-center text-small text-n-600">
            {t('from')}
          </span>
        )}
        <InputGroup
          size="m"
          suffix={MARKET.currency}
          inputMode="numeric"
          placeholder="0"
          aria-label={from ? t('priceFrom', { name }) : t('price', { name })}
          value={r.price}
          disabled={off}
          onChange={(e) => onChange({ price: e.target.value.replace(/\D/g, '').slice(0, 5) })}
          className="[&_input]:text-right"
        />
      </span>
    </div>
  )
}
