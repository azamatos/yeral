import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocale } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useDebounced } from '@/shared/lib'
import { addressEdited, addressProblem, addressUpdate, formFrom, type AddressForm, type LatLng } from './address'

/** The search asks after this pause in the typing, from 3 letters (the api's least). */
const SEARCH_PAUSE_MS = 300
export const SEARCH_MIN = 3

type State = {
  slug: string
  form: AddressForm
  /** What the profile has, kept up to date by the saves: only what differs is sent. */
  stored: AddressForm
  /** Where the map looks: the picked address or the city, not every move of the pin. */
  focus: LatLng
}

/** A city to pick, with its centre for the map. */
export type AddressCity = { id: string; name: string; lat: number; lng: number }

export type AddressSearchResult = { label: string; line: string; street: string; lat: number; lng: number }

export type AddressFormState = {
  form: AddressForm
  focus: LatLng
  cities: readonly AddressCity[]
  /** Changes the form; `focus` moves the map there too (a picked address, another city). */
  set: (change: (f: AddressForm) => AddressForm, focus?: LatLng) => void
  /** What was typed, trimmed, and the search's answer for it once the typing paused. */
  typed: string
  searching: boolean
  found: readonly AddressSearchResult[]
  /** Nothing found, or no search here: the typed street, pinned by hand. */
  byHand: boolean
  problem: ReturnType<typeof addressProblem>
  /** Differs from the profile's. */
  edited: boolean
  saving: boolean
  /** Sends the address when it's valid and changed; throws what the api said. */
  save: () => Promise<void>
  discard: () => void
}

/**
 * The business's address as a form (the wizard's step 3 and Business profile; B-Onboarding `isAddr`, B-Settings
 * «Address», book B-04): loads the profile and the cities while `on`, keeps the edits (also while the wizard is on
 * another step), searches the address after a pause in the typing, and saves the location, the floor, the entrance
 * note and «I work from home» to the profile. `null` until loaded; a first load that failed throws. While nothing is
 * edited the form follows the profile as it reloads; another business's slug starts it again.
 */
export function useAddressForm(slug: string, on: boolean): AddressFormState | null {
  const sdk = useSdk()
  const locale = useLocale()
  const profile = useQuery({ ...sdk.settings.profile(slug), enabled: on })
  const cities = useQuery({ ...sdk.catalog.cities(locale), enabled: on })
  const update = useMutation(sdk.settings.updateProfile(slug))
  const [state, setState] = useState<State | null>(null)
  const current = state?.slug === slug ? state : null
  const loaded = profile.data ? formFrom(profile.data) : null
  const edited = !!current && addressEdited(current.form, current.stored)
  if (on && loaded && (!current || (!edited && !update.isPending && addressEdited(loaded, current.stored)))) {
    setState({ slug, form: loaded, stored: loaded, focus: loaded.pin })
  }
  const form = current?.form

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
  if (on && !form && (profile.isError || cities.isError)) throw profile.error ?? cities.error ?? new Error('address data missing')
  if (!on || !current || !form || !cities.data) return null

  const save = async () => {
    if (!addressEdited(form, current.stored) || addressProblem(form) || !form.picked) return
    await update.mutateAsync(addressUpdate({ ...form, picked: form.picked }))
    setState((s) => s && { ...s, stored: form })
  }

  return {
    form,
    focus: current.focus,
    cities: cities.data.items,
    set: (change, focus) => setState((s) => s && { ...s, form: change(s.form), focus: focus ?? s.focus }),
    typed,
    searching,
    found: search.data?.items ?? [],
    byHand: searching && (search.isError || (search.isSuccess && !search.isPlaceholderData && (search.data?.items.length ?? 0) === 0)),
    problem: addressProblem(form),
    edited,
    saving: update.isPending,
    save,
    discard: () => setState((s) => s && { ...s, form: s.stored, focus: s.stored.pin }),
  }
}
