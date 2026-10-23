import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SetupStep } from '@yeral/domain/setup'
import { Callout } from '@yeral/ui/callout'
import { Combobox, ComboboxInput, ComboboxList, type ComboboxOption } from '@yeral/ui/combobox'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { MapFrame, MapPinHandle } from '@yeral/ui/map-frame'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { Info, MapPin, Move } from 'lucide-react'
import { useId, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { useDebounced } from '@/shared/lib'
import {
  ADDRESS_MAX,
  addressEdited,
  addressProblem,
  addressUpdate,
  ENTRANCE_MAX,
  FLOOR_MAX,
  formFrom,
  type AddressForm,
  type LatLng,
} from '../model/address'
import { stepIndex } from '../model/steps'
import { StepHeader, type StepFrame } from './setup-frame'

/** The search asks after this pause in the typing, from 3 letters (the api's least). */
const SEARCH_PAUSE_MS = 300
const SEARCH_MIN = 3

type City = { id: string; name: string; lat: number; lng: number }

/**
 * Step 3, «Where will clients find you?» (B-Onboarding `isAddr`, book B-04): the city, the address searched and picked
 * from the list, the pin to fine-tune on the map (or the approximate circle for someone who works from home), the floor
 * and the entrance note. Continue saves them to the draft's profile and opens the hours.
 */
export function AddressStep({
  slug,
  saved,
  frame,
  onContinued,
}: {
  slug: string
  /** The draft's saved step: Continue moves it on to the hours. */
  saved: SetupStep
  frame: StepFrame
  onContinued: () => void
}) {
  const sdk = useSdk()
  const locale = useLocale()
  const profile = useQuery(sdk.settings.profile(slug))
  const cities = useQuery(sdk.catalog.cities(locale))
  if (profile.isPending || cities.isPending)
    return frame(
      <div className="flex justify-center py-16">
        <Spinner />
      </div>,
      { valid: false, busy: true, keep: () => Promise.resolve(true) },
    )
  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (!profile.data || !cities.data) throw profile.error ?? cities.error ?? new Error('address step data missing')
  return (
    <Form slug={slug} saved={saved} initial={formFrom(profile.data)} cities={cities.data.items} frame={frame} onContinued={onContinued} />
  )
}

function Form({
  slug,
  saved,
  initial,
  cities,
  frame,
  onContinued,
}: {
  slug: string
  saved: SetupStep
  initial: AddressForm
  cities: City[]
  frame: StepFrame
  onContinued: () => void
}) {
  const t = useTranslations('setup.address')
  const sdk = useSdk()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const homeId = useId()
  // what the profile has, kept up to date by the saves: leaving the step saves only what differs
  const [stored, setStored] = useState(initial)
  const [form, setForm] = useState(initial)
  // where the map looks: the picked address or the city, not every move of the pin
  const [focus, setFocus] = useState<LatLng>(initial.pin)
  const update = useMutation(sdk.settings.updateProfile(slug))
  const saveStep = useMutation(sdk.setup.step(slug))
  const busy = update.isPending || saveStep.isPending

  const city = cities.find((c) => c.id === form.cityId)
  const typed = form.query.trim()
  const asked = useDebounced(typed, SEARCH_PAUSE_MS)
  const searching = !form.picked && asked.length >= SEARCH_MIN
  const search = useQuery({
    ...sdk.settings.addressSearch(slug, { q: asked, cityId: form.cityId, lang: locale }),
    enabled: searching,
    placeholderData: keepPreviousData,
  })
  const pin = <MapPin aria-hidden strokeWidth={1.75} />
  const found = search.data?.items ?? []
  // nothing found, or no search here (`address_search_unavailable`): the typed street, pinned by hand
  const byHand = searching && (search.isError || (search.isSuccess && !search.isPlaceholderData && found.length === 0))
  const options: ComboboxOption[] = byHand
    ? [{ id: 'typed', label: typed, description: t('byHand', { city: city?.name ?? '' }), icon: pin }]
    : found.map((a, i) => ({ id: `${i}:${a.label}`, label: a.line, description: a.label, icon: pin }))

  const choose = (option: ComboboxOption) => {
    const at = byHand ? null : found[Number(option.id.split(':')[0])]
    if (at) {
      const place = { lat: at.lat, lng: at.lng }
      setForm((f) => ({ ...f, query: at.line, picked: { line: at.line, street: at.street }, pin: place }))
      setFocus(place)
    } else setForm((f) => ({ ...f, query: typed, picked: { line: typed, street: typed }, pin: focus }))
  }

  const pickCity = (id: string) => {
    const next = cities.find((c) => c.id === id)
    if (!next || id === form.cityId) return
    const centre = { lat: next.lat, lng: next.lng }
    setForm((f) => ({ ...f, cityId: id, query: '', picked: null, pin: centre }))
    setFocus(centre)
  }

  const problem = addressProblem(form)
  const edited = addressEdited(form, stored)

  /** The address into the draft's profile; false when it failed (the person heard why). */
  const store = async (): Promise<boolean> => {
    if (!form.picked) return true
    try {
      await update.mutateAsync(addressUpdate({ ...form, picked: form.picked }))
      // the profile's save refreshes the settings, not the draft's summary in the step list
      await queryClient.invalidateQueries({ queryKey: sdk.setup.mine().queryKey })
      setStored(form)
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const onContinue = async () => {
    if (busy || problem) return
    if (edited && !(await store())) return
    try {
      if (stepIndex(saved) < stepIndex('hours')) await saveStep.mutateAsync('hours')
      onContinued()
    } catch (error) {
      toast(errorText(error))
    }
  }

  const hint =
    problem === 'long'
      ? t('hintLong', { max: ADDRESS_MAX })
      : problem === 'entrance'
        ? t('hintEntrance', { max: ENTRANCE_MAX })
        : problem === 'floor'
          ? t('hintFloor', { max: FLOOR_MAX })
          : t('hintPick')
  const counter = (value: number, max: number) => ({ value, max, text: t('counter', { count: value, max }) })
  const entranceLength = form.entrance.trim().length
  const floorLength = form.floor.trim().length

  const body = (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="address" title={t('title')} lead={t('lead')} />
      <Field label={t('city')} className="max-w-80">
        <Select value={form.cityId} onChange={(e) => pickCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Combobox
        variant="address"
        value={form.query}
        onValueChange={(query) => setForm((f) => ({ ...f, query, picked: null }))}
        options={options}
        onSelect={choose}
        open={!form.picked && typed.length >= SEARCH_MIN && options.length > 0}
        listLabel={t('suggestions')}
      >
        <div className="flex flex-col gap-1.5">
          <Field
            label={t('address')}
            error={problem === 'long' && t('tooLong', { max: ADDRESS_MAX })}
            counter={counter(typed.length, ADDRESS_MAX)}
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
      <div className="flex flex-col gap-2.5">
        <MapFrame
          center={focus}
          controls={{ zoomIn: t('zoomIn'), zoomOut: t('zoomOut') }}
          overlay={!form.picked && t('pickFirst')}
          onMapClick={(at) => setForm((f) => ({ ...f, pin: at }))}
          className="h-80 rounded-card max-sm:h-60"
        >
          <MapPinHandle
            at={form.pin}
            area={form.home}
            label={form.home ? t('areaLabel') : t('pinLabel')}
            onMove={(at) => setForm((f) => ({ ...f, pin: at }))}
          />
        </MapFrame>
        {form.picked && (
          <span className="inline-flex items-center gap-1.5 text-dense text-n-600">
            <Move aria-hidden strokeWidth={1.75} className="size-4 flex-none" />
            {form.home ? t('dragArea') : t('dragPin')}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span id={homeId} className="text-body font-semibold">
              {t('home')}
            </span>
            <span className="text-dense text-n-600">{t('homeHint')}</span>
          </div>
          <Switch aria-labelledby={homeId} checked={form.home} onCheckedChange={(home) => setForm((f) => ({ ...f, home }))} />
        </div>
        {form.home && (
          <Callout tone="neutral" icon={<Info aria-hidden strokeWidth={1.75} />} live>
            {t('homeNote')}
          </Callout>
        )}
      </div>
      <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 max-sm:grid-cols-1">
        <Field
          label={t('floor')}
          error={problem === 'floor' && t('tooLong', { max: FLOOR_MAX })}
          counter={floorLength > FLOOR_MAX ? counter(floorLength, FLOOR_MAX) : undefined}
        >
          <Input
            value={form.floor}
            placeholder={t('floorPlaceholder')}
            maxLength={FLOOR_MAX * 2}
            onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
          />
        </Field>
        <Field
          label={t('entrance')}
          hint={t('entranceHint')}
          error={problem === 'entrance' && t('tooLong', { max: ENTRANCE_MAX })}
          counter={counter(entranceLength, ENTRANCE_MAX)}
        >
          <Input
            value={form.entrance}
            placeholder={t('entrancePlaceholder')}
            maxLength={ENTRANCE_MAX * 2}
            onChange={(e) => setForm((f) => ({ ...f, entrance: e.target.value }))}
          />
        </Field>
      </div>
    </section>
  )

  return frame(body, {
    valid: !problem,
    hint: problem ? hint : undefined,
    busy,
    onContinue: () => void onContinue(),
    // the list and «Continue later» keep a valid address; one still being typed stays as it was
    keep: async () => (edited && !problem ? store() : true),
  })
}
