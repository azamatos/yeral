import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { localized, PRICE_TYPES, type PriceType } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { SERVICE_BUFFERS } from '@yeral/domain/services'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Checkbox } from '@yeral/ui/checkbox'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Input, Textarea } from '@yeral/ui/input'
import { InputGroup } from '@yeral/ui/input-group'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Eye, Trash2, TriangleAlert } from 'lucide-react'
import { useId, useRef, useState, type RefObject } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { choicesWith } from '@/shared/lib'
import {
  addInput,
  DURATION_CHOICES,
  formFrom,
  formProblems,
  needsAmount,
  newForm,
  PRICE_DIGITS,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_NAME_MAX,
  takesAmount,
  updateInput,
  type ServiceForm,
} from '../model/service-form'

type Service = Menu['groups'][number]['services'][number]

/** What the drawer opens on: a service to edit, or a new one in a group. */
export type DrawerTarget = { service: Service } | { groupId: string }

const RULE = 'rule'

/**
 * The service drawer (B-Services `.drw`, design §28.6, book B-38): a new service or one to edit — its name and
 * description, group, length, own buffer (or Booking rules'), price (Fixed · From · Free · Price at the place, which
 * keeps an amount clients don't see) with what clients see, who does it (every team row not removed; invited people
 * and people without the app marked) and online booking. Save adds it or sends what changed; the person hears it.
 */
export function ServiceDrawer({
  slug,
  target,
  groups,
  team,
  onClose,
  onDelete,
  returnFocus,
}: {
  slug: string
  target: DrawerTarget | null
  groups: Menu['groups']
  /** The team for «Who does it»; `null` while it loads, `'failed'` when it didn't. */
  team: TeamMember[] | null | 'failed'
  onClose: () => void
  /** «Delete service» at the drawer's foot (an existing service). */
  onDelete: (service: Service) => void
  returnFocus?: RefObject<HTMLElement | null>
}) {
  // while a save is on its way the drawer stays: its answer belongs to this form
  const busy = useRef(false)
  return (
    <Drawer scrim="auto" open={!!target} onOpenChange={(open) => !open && !busy.current && onClose()} returnFocus={returnFocus}>
      {target && (
        <DrawerContent aria-describedby={undefined}>
          <ServiceEditor
            // a fresh form for each service opened
            key={'service' in target ? target.service.id : `new:${target.groupId}`}
            slug={slug}
            target={target}
            groups={groups}
            team={team}
            onClose={onClose}
            onDelete={onDelete}
            onBusy={(on) => {
              busy.current = on
            }}
          />
        </DrawerContent>
      )}
    </Drawer>
  )
}

function ServiceEditor({
  slug,
  target,
  groups,
  team,
  onClose,
  onDelete,
  onBusy,
}: {
  slug: string
  target: DrawerTarget
  groups: Menu['groups']
  team: TeamMember[] | null | 'failed'
  onClose: () => void
  onDelete: (service: Service) => void
  onBusy: (busy: boolean) => void
}) {
  const t = useTranslations('settings.services.drawer')
  const tc = useTranslations('common')
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const rules = useQuery(sdk.settings.rules(slug))
  const add = useMutation(sdk.settings.addService(slug))
  const update = useMutation(sdk.settings.updateService(slug))
  const service = 'service' in target ? target.service : null
  const [form, setForm] = useState<ServiceForm>(() => ('groupId' in target ? newForm(target.groupId) : formFrom(target.service, locale)))
  const [tried, setTried] = useState(false)
  const set = (change: Partial<ServiceForm>) => setForm((f) => ({ ...f, ...change }))
  const ids = { price: useId(), who: useId(), online: useId() }
  const problems = tried ? formProblems(form) : {}
  const [saving, setSaving] = useState(false)
  const group = groups.find((g) => g.id === form.groupId)
  const people = Array.isArray(team) ? team.filter((m) => m.status !== 'removed') : []
  const anyInvited = form.staffIds.some((id) => people.find((m) => m.id === id)?.status === 'invited')
  const amount = Number(form.amount) || 0
  const preview =
    needsAmount(form.priceType) && !amount
      ? t(form.priceType === 'from' ? 'previewFromEmpty' : 'previewEmpty', { currency: MARKET.currency })
      : fmt.price({ type: form.priceType, amount })

  const save = async () => {
    setTried(true)
    if (saving || Object.keys(formProblems(form)).length) return
    const name = form.name.trim()
    const changes = service ? updateInput(form, service, locale) : null
    if (service && !changes) return onClose()
    setSaving(true)
    onBusy(true)
    try {
      if (service && changes) await update.mutateAsync({ serviceId: service.id, ...changes })
      else await add.mutateAsync(addInput(form, locale))
      toast(service ? t('saved', { name }) : t('added', { name }))
      onBusy(false)
      onClose()
    } catch (error) {
      toast(errorText(error))
      onBusy(false)
      setSaving(false)
    }
  }

  return (
    <>
      <DrawerHeader
        title={service ? t('editTitle') : t('newTitle')}
        subtitle={
          service
            ? t('editSub', { group: group ? localized(group.name, locale) : '', name: localized(service.name, locale) })
            : t('newSub', { group: group ? localized(group.name, locale) : '' })
        }
        closeLabel={t('close')}
      />
      <DrawerBody>
        <form
          id="service-form"
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field label={t('name')} error={problems.name && t('nameMissing')}>
            <Input
              className="h-11"
              maxLength={SERVICE_NAME_MAX}
              placeholder={t('namePlaceholder')}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </Field>
          <Field
            label={t('description')}
            optional={t('optional')}
            error={problems.description && t('descriptionLong', { max: SERVICE_DESCRIPTION_MAX })}
            counter={{
              value: form.description.length,
              max: SERVICE_DESCRIPTION_MAX,
              text: t('count', { n: form.description.length, max: SERVICE_DESCRIPTION_MAX }),
            }}
          >
            <Textarea
              placeholder={t('descriptionPlaceholder')}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field label={t('group')}>
              <Select size="m" value={form.groupId} onChange={(e) => set({ groupId: e.target.value })}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {localized(g.name, locale)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('duration')}>
              <Select size="m" value={form.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })}>
                {choicesWith(DURATION_CHOICES, form.durationMin).map((m) => (
                  <option key={m} value={m}>
                    {fmt.duration(m)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label={t('buffer')}
            hint={t.rich('bufferHint', {
              link: (words) => (
                <Link to="/w/$slug/settings/rules" params={{ slug }} className={textLink}>
                  {words}
                </Link>
              ),
            })}
          >
            <Select size="m" value={form.buffer} onChange={(e) => set({ buffer: e.target.value === RULE ? RULE : Number(e.target.value) })}>
              <option value={RULE}>
                {rules.data ? t('bufferRule', { buffer: fmt.duration(rules.data.bufferMinutes) }) : t('bufferRuleShort')}
              </option>
              {SERVICE_BUFFERS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? t('bufferNone') : fmt.duration(m)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="h-px bg-n-200" />

          <div className="flex flex-col gap-2.5">
            <span id={ids.price} className="text-dense font-semibold text-n-900">
              {t('price')}
            </span>
            <ChipRadioGroup
              aria-labelledby={ids.price}
              value={form.priceType}
              onValueChange={(v) => set({ priceType: v as PriceType })}
              options={PRICE_TYPES.map((p) => ({ value: p, label: t(`priceTypes.${p}`) }))}
            />
            {takesAmount(form.priceType) && (
              <Field
                label={t(form.priceType === 'from' ? 'amountFrom' : form.priceType === 'hidden' ? 'amountHidden' : 'amount')}
                error={problems.amount && t('amountMissing')}
                className="pt-1.5"
              >
                <InputGroup
                  size="m"
                  inputMode="numeric"
                  suffix={MARKET.currency}
                  placeholder="0"
                  className="w-40"
                  value={form.amount}
                  onChange={(e) => set({ amount: e.target.value.replace(/\D/g, '').slice(0, PRICE_DIGITS) })}
                />
              </Field>
            )}
            <p className="m-0 flex items-center gap-2 text-small text-n-600">
              <Eye aria-hidden strokeWidth={1.75} className="size-4 flex-none" />
              <span>{t.rich('preview', { price: preview, b: (words) => <b className="text-n-900">{words}</b> })}</span>
            </p>
            {form.priceType === 'hidden' && <span className="text-dense text-n-600">{t('hiddenNote')}</span>}
          </div>

          <div className="h-px bg-n-200" />

          <div className="flex flex-col gap-2">
            <span id={ids.who} className="text-dense font-semibold text-n-900">
              {t('who')}
            </span>
            {team === null && <Spinner />}
            {team === 'failed' && <p className="m-0 text-small text-n-600">{t('teamFailed')}</p>}
            <div role="group" aria-labelledby={ids.who} className="flex flex-col">
              {people.map((m) => (
                <label key={m.id} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-n-200 py-1.5 last:border-b-0">
                  <Checkbox
                    checked={form.staffIds.includes(m.id)}
                    onChange={(e) =>
                      set({ staffIds: e.target.checked ? [...form.staffIds, m.id] : form.staffIds.filter((id) => id !== m.id) })
                    }
                  />
                  <Avatar name={m.name} src={m.photo?.url} size={32} decorative />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-small font-semibold text-n-900">{m.name}</span>
                    {m.specialization && <span className="text-dense text-n-600">{m.specialization}</span>}
                  </span>
                  {m.status === 'invited' ? (
                    <span className="rounded-pill bg-a-50 px-2 py-0.5 text-micro font-semibold text-a-600">{t('invitedTag')}</span>
                  ) : (
                    !m.hasApp && (
                      <span className="rounded-pill bg-n-100 px-2 py-0.5 text-micro font-semibold text-n-600">{t('noAppTag')}</span>
                    )
                  )}
                </label>
              ))}
            </div>
            {!Array.isArray(team) ? null : form.staffIds.length ? (
              <span className="text-dense text-n-600">{t('whoHint')}</span>
            ) : (
              <Callout tone="warning" size="s" icon={<TriangleAlert aria-hidden />} live>
                {t('whoNone')}
              </Callout>
            )}
            {anyInvited && <span className="text-dense text-n-600">{t('whoInvited')}</span>}
          </div>

          <div className="h-px bg-n-200" />

          <div className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id={ids.online} className="text-body font-medium text-n-900">
                {t('online')}
              </span>
              <span className="text-dense text-n-600">{form.online ? t('onlineOn', { brand: tc('brand') }) : t('onlineOff')}</span>
            </span>
            <Switch aria-labelledby={ids.online} checked={form.online} onCheckedChange={(online) => set({ online })} />
          </div>
        </form>
      </DrawerBody>
      <DrawerFooter className="sm:[&>*]:flex-none">
        {service && (
          <button
            type="button"
            className="mr-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xs border-0 bg-transparent p-0 text-small font-semibold text-danger-ink hover:underline focus-visible:shadow-focus focus-visible:outline-none max-sm:basis-full"
            onClick={() => onDelete(service)}
          >
            <Trash2 aria-hidden strokeWidth={1.75} className="size-4" />
            {t('delete')}
          </button>
        )}
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit" form="service-form" variant="primary" loading={saving} loadingLabel={t('saving')}>
          {t('save')}
        </Button>
      </DrawerFooter>
    </>
  )
}
