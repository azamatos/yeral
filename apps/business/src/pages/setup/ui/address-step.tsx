import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { useId, useState, type ReactNode } from 'react'
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
import { StepHeader, type StepAction } from './setup-frame'

/** The search asks after this pause in the typing, from 3 letters (the api's least). */
const SEARCH_PAUSE_MS = 300
const SEARCH_MIN = 3

type State = {
  form: AddressForm
  /** What the profile has, kept up to date by the saves: leaving the step saves only what differs. */
  stored: AddressForm
  /** Where the map looks: the picked address or the city, not every move of the pin. */
  focus: LatLng
}

/**
 * Step 3, «Where will clients find you?» (B-Onboarding `isAddr`, book B-03): the city, the address searched and picked
 * from the list, the pin to fine-tune on the map (or the approximate circle for someone who works from home), the floor
 * and the entrance note. Its `save` puts them into the draft's profile. A hook, so the wizard's frame stays the same
 * element around every step; `on` while the step shows (its data loads then, and what's typed stays while the wizard
 * is on another step).
 */
export function useAddressStep(slug: string, on: boolean): { body: ReactNode; action: StepAction } {
  const t = useTranslations('setup.address')
  const sdk = useSdk()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const homeId = useId()
  const profile = useQuery({ ...sdk.settings.profile(slug), enabled: on })
  const cities = useQuery({ ...sdk.catalog.cities(locale), enabled: on })
  const update = useMutation(sdk.settings.updateProfile(slug))
  const [state, setState] = useState<State | null>(null)
  if (on && !state && profile.data) {
    const form = formFrom(profile.data)
    setState({ form, stored: form, focus: form.pin })
  }
  const form = state?.form
  const setForm = (change: (f: AddressForm) => AddressForm, focus?: LatLng) =>
    setState((s) => s && { ...s, form: change(s.form), focus: focus ?? s.focus })

  const typed = form?.query.trim() ?? ''
  const asked = useDebounced(typed, SEARCH_PAUSE_MS)
  // only once the typing has paused: the line just picked (or reopened) isn't asked again at the first new letter
  const searching = on && !!form && !form.picked && asked === typed && asked.length >= SEARCH_MIN
  const search = useQuery({
    ...sdk.settings.addressSearch(slug, { q: asked, cityId: form?.cityId ?? '', lang: locale }),
    enabled: searching,
    placeholderData: keepPreviousData,
  })

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && !form && (profile.isError || cities.isError)) throw profile.error ?? cities.error ?? new Error('address step data missing')
  if (!on || !state || !form || !cities.data)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      // loading isn't saving: Continue waits, nothing is announced
      action: { valid: false, busy: false, ready: false, save: () => Promise.resolve(true) },
    }

  const city = cities.data.items.find((c) => c.id === form.cityId)
  const pin = <MapPin aria-hidden strokeWidth={1.75} />
  const found = search.data?.items ?? []
  const asking = !form.picked && typed.length >= SEARCH_MIN
  // nothing found, or no search here (`address_search_unavailable`): the typed street, pinned by hand
  const byHand = searching && (search.isError || (search.isSuccess && !search.isPlaceholderData && found.length === 0))
  const options: ComboboxOption[] = byHand
    ? [{ id: 'typed', label: typed, description: t('byHand', { city: city?.name ?? '' }), icon: pin }]
    : asking
      ? found.map((a, i) => ({ id: `${i}:${a.label}`, label: a.line, description: a.label, icon: pin }))
      : []

  const choose = (option: ComboboxOption) => {
    const at = byHand ? null : found[Number(option.id.split(':')[0])]
    if (at) {
      const place = { lat: at.lat, lng: at.lng }
      setForm((f) => ({ ...f, query: at.line, picked: { line: at.line, street: at.street }, pin: place }), place)
    }
    // by hand: the pin stays where it is, and the map shows it
    else setForm((f) => ({ ...f, query: typed, picked: { line: typed, street: typed } }), form.pin)
  }

  const pickCity = (id: string) => {
    const next = cities.data.items.find((c) => c.id === id)
    if (!next || id === form.cityId) return
    const centre = { lat: next.lat, lng: next.lng }
    setForm((f) => ({ ...f, cityId: id, query: '', picked: null, pin: centre }), centre)
  }

  const problem = addressProblem(form)
  const edited = addressEdited(form, state.stored)

  /** The address into the draft's profile when it's valid and changed; false when it failed (the person heard why). */
  const save = async (): Promise<boolean> => {
    if (!edited || problem || !form.picked) return true
    try {
      await update.mutateAsync(addressUpdate({ ...form, picked: form.picked }))
      // the profile's save refreshes the settings, not the draft's summary in the step list
      await queryClient.invalidateQueries({ queryKey: sdk.setup.mine().queryKey })
      setState((s) => s && { ...s, stored: form })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
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
          {cities.data.items.map((c) => (
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
        open={options.length > 0}
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
          center={state.focus}
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

  return {
    body,
    action: { valid: !problem, hint: problem ? hint : undefined, busy: update.isPending, ready: true, save },
  }
}
