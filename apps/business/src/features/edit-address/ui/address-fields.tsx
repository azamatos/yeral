import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { Combobox, ComboboxInput, ComboboxList, type ComboboxOption } from '@yeral/ui/combobox'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { MapFrame, MapPinHandle } from '@yeral/ui/map-frame'
import { Select } from '@yeral/ui/select'
import { SettingsRow } from '@yeral/ui/settings-row'
import { Switch } from '@yeral/ui/switch'
import { Info, MapPin, Move } from 'lucide-react'
import { useId } from 'react'
import { useTranslations } from 'use-intl'
import { ADDRESS_MAX, ENTRANCE_MAX, FLOOR_MAX } from '../model/address'
import { SEARCH_MIN, type AddressFormState } from '../model/use-address-form'

/**
 * The address's fields (B-Onboarding `isAddr`, B-Settings «Address»): the city, the address searched and picked from
 * the list (or typed and pinned by hand when the search has nothing), the pin to fine-tune on the map (the approximate
 * circle for someone who works from home), «I work from home», the floor and the entrance note. The form is
 * `useAddressForm`'s; the page around it says what saving means (Continue in the wizard, the save bar in Settings).
 *
 * `layout="settings"` (B-Settings `.gad`): the city (220) beside «Street and building», the floor beside the entrance,
 * then the 260 map (220 on phones) with the board's words under it and «I work from home» as a settings row; the
 * wizard's (`steps`) goes down one field at a time with the 320 map.
 */
export function AddressFields({
  address,
  disabled = false,
  layout = 'steps',
}: {
  address: AddressFormState
  disabled?: boolean
  layout?: 'steps' | 'settings'
}) {
  const t = useTranslations('setup.address')
  const words = useTranslations('setup.address.inSettings')
  const settings = layout === 'settings'
  const homeId = useId()
  const { form, set, typed, found, byHand, problem } = address
  const city = address.cities.find((c) => c.id === form.cityId)
  const pin = <MapPin aria-hidden strokeWidth={1.75} />
  const asking = !form.picked && typed.length >= SEARCH_MIN
  const options: ComboboxOption[] = byHand
    ? [{ id: 'typed', label: typed, description: t('byHand', { city: city?.name ?? '' }), icon: pin }]
    : asking
      ? found.map((a, i) => ({ id: `${i}:${a.label}`, label: a.line, description: a.label, icon: pin }))
      : []

  const choose = (option: ComboboxOption) => {
    const at = byHand ? null : found[Number(option.id.split(':')[0])]
    if (at) {
      const place = { lat: at.lat, lng: at.lng }
      set((f) => ({ ...f, query: at.line, picked: { line: at.line, street: at.street }, pin: place }), place)
    }
    // by hand: the pin stays where it is, and the map shows it
    else set((f) => ({ ...f, query: typed, picked: { line: typed, street: typed } }), form.pin)
  }

  const pickCity = (id: string) => {
    const next = address.cities.find((c) => c.id === id)
    if (!next || id === form.cityId) return
    const centre = { lat: next.lat, lng: next.lng }
    set((f) => ({ ...f, cityId: id, query: '', picked: null, pin: centre }), centre)
  }

  const counter = (value: number, max: number) => ({ value, max, text: t('counter', { count: value, max }) })
  const entranceLength = form.entrance.trim().length
  const floorLength = form.floor.trim().length

  const cityField = (
    <Field label={t('city')} className={settings ? undefined : 'max-w-80'} disabled={disabled}>
      <Select value={form.cityId} onChange={(e) => pickCity(e.target.value)}>
        {address.cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </Field>
  )

  const streetField = (
    <Combobox
      variant="address"
      value={form.query}
      onValueChange={(query) => set((f) => ({ ...f, query, picked: null }))}
      options={options}
      onSelect={choose}
      open={options.length > 0}
      listLabel={t('suggestions')}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <Field
          label={settings ? words('street') : t('address')}
          error={problem === 'long' && t('tooLong', { max: ADDRESS_MAX })}
          // a picked address keeps its street within the limit; its line (a search result) may be longer
          counter={counter(form.picked ? form.picked.street.length : typed.length, ADDRESS_MAX)}
          disabled={disabled}
        >
          <ComboboxInput
            placeholder={t('addressPlaceholder')}
            // twice the limit can be typed, so the counter and the error show what's too long (as the board does)
            maxLength={ADDRESS_MAX * 2}
          />
        </Field>
        <ComboboxList />
      </div>
    </Combobox>
  )

  const map = (
    <div className="flex flex-col gap-2.5">
      <MapFrame
        center={address.focus}
        controls={{ zoomIn: t('zoomIn'), zoomOut: t('zoomOut') }}
        overlay={!form.picked && t('pickFirst')}
        onMapClick={(at) => !disabled && set((f) => ({ ...f, pin: at }))}
        className={settings ? 'h-65 rounded-m max-sm:h-55' : 'h-80 rounded-card max-sm:h-60'}
      >
        <MapPinHandle
          at={form.pin}
          area={form.home}
          label={form.home ? t('areaLabel') : t('pinLabel')}
          onMove={(at) => !disabled && set((f) => ({ ...f, pin: at }))}
        />
      </MapFrame>
      {form.picked && (
        <span className="inline-flex items-center gap-1.5 text-dense text-n-600">
          <Move aria-hidden strokeWidth={1.75} className="size-4 flex-none" />
          {settings ? (form.home ? words('dragArea') : words('dragPin')) : form.home ? t('dragArea') : t('dragPin')}
        </span>
      )}
    </div>
  )

  const homeSwitch = (ids: { id?: string; labelId: string; descriptionId?: string }) => (
    <Switch
      id={ids.id}
      aria-labelledby={ids.labelId}
      aria-describedby={ids.descriptionId}
      checked={form.home}
      disabled={disabled}
      onCheckedChange={(home) => set((f) => ({ ...f, home }))}
    />
  )
  const homeNote = form.home && (
    <Callout tone="neutral" icon={<Info aria-hidden strokeWidth={1.75} />} live>
      {t('homeNote')}
    </Callout>
  )

  const floorAndEntrance = (
    <div
      className={cn(
        'grid gap-4 max-sm:grid-cols-1',
        settings ? 'grid-cols-[minmax(0,220px)_minmax(0,1fr)]' : 'grid-cols-[160px_minmax(0,1fr)]',
      )}
    >
      <Field
        label={t('floor')}
        error={problem === 'floor' && t('tooLong', { max: FLOOR_MAX })}
        counter={floorLength > FLOOR_MAX ? counter(floorLength, FLOOR_MAX) : undefined}
        disabled={disabled}
      >
        <Input
          value={form.floor}
          placeholder={t('floorPlaceholder')}
          maxLength={FLOOR_MAX * 2}
          onChange={(e) => set((f) => ({ ...f, floor: e.target.value }))}
        />
      </Field>
      <Field
        label={t('entrance')}
        hint={settings ? undefined : t('entranceHint')}
        error={problem === 'entrance' && t('tooLong', { max: ENTRANCE_MAX })}
        counter={counter(entranceLength, ENTRANCE_MAX)}
        disabled={disabled}
      >
        <Input
          value={form.entrance}
          placeholder={t('entrancePlaceholder')}
          maxLength={ENTRANCE_MAX * 2}
          onChange={(e) => set((f) => ({ ...f, entrance: e.target.value }))}
        />
      </Field>
    </div>
  )

  if (settings)
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-start gap-4 max-sm:grid-cols-1">
          {cityField}
          {streetField}
        </div>
        {floorAndEntrance}
        {map}
        <SettingsRow label={t('home')} description={t('homeHint')}>
          {homeSwitch}
        </SettingsRow>
        {homeNote}
      </div>
    )

  return (
    <div className="flex flex-col gap-8 max-sm:gap-7">
      {cityField}
      {streetField}
      {map}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span id={homeId} className="text-body font-semibold">
              {t('home')}
            </span>
            <span className="text-dense text-n-600">{t('homeHint')}</span>
          </div>
          {homeSwitch({ labelId: homeId })}
        </div>
        {homeNote}
      </div>
      {floorAndEntrance}
    </div>
  )
}
