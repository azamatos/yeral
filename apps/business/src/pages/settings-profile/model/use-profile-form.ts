import { useMutation, useQuery } from '@tanstack/react-query'
import type { BusinessProfile } from '@yeral/contract/settings'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { formFrom, isValid, problemsOf, profileSaved, profileUpdate, rulesUpdate, type ProfileForm } from './profile'

export type ProfileFormState = {
  profile: BusinessProfile
  form: ProfileForm
  set: (change: Partial<ProfileForm>) => void
  problems: ReturnType<typeof problemsOf>
  dirty: boolean
  valid: boolean
  /** A save is on its way: the fields wait, so nothing typed meanwhile is left out of it. */
  saving: boolean
  /** Sends what changed; false when it failed (the person heard why in a toast). */
  save: () => Promise<boolean>
  discard: () => void
}

type State = { slug: string; form: ProfileForm; stored: ProfileForm; loadedAt: number }

/**
 * Business profile's details as a form (`model/profile.ts`): loads the profile and the rules (for «Pause online
 * booking»), keeps the edits, saves only what changed, the profile and the pause each to its own endpoint. `null` until
 * both load; a first load that failed throws (a failed refetch keeps what's on screen). While nothing is edited the
 * form follows them as they reload (another admin's change, a live update); another business's slug starts it again.
 */
export function useProfileForm(slug: string): ProfileFormState | null {
  const sdk = useSdk()
  const errorText = useErrorText()
  const profile = useQuery(sdk.settings.profile(slug))
  const rules = useQuery(sdk.settings.rules(slug))
  const updateProfile = useMutation(sdk.settings.updateProfile(slug))
  const updateRules = useMutation(sdk.settings.updateRules(slug))
  const [state, setState] = useState<State | null>(null)
  const current = state?.slug === slug ? state : null
  const saving = updateProfile.isPending || updateRules.isPending
  const loadedAt = Math.max(profile.dataUpdatedAt, rules.dataUpdatedAt)
  const edited = !!current && (profileUpdate(current.form, current.stored) !== null || rulesUpdate(current.form, current.stored) !== null)
  if (profile.data && rules.data && (!current || (!edited && !saving && loadedAt > current.loadedAt))) {
    const form = formFrom(profile.data, rules.data.onlineEnabled)
    setState({ slug, form, stored: form, loadedAt })
  }

  if (!current && !profile.data && profile.isError) throw profile.error
  if (!current && !rules.data && rules.isError) throw rules.error
  if (!current || !profile.data) return null
  const { form, stored } = current

  const save = async (): Promise<boolean> => {
    if (!isValid(form, stored)) return false
    const changes = profileUpdate(form, stored)
    const pause = rulesUpdate(form, stored)
    try {
      if (changes) {
        await updateProfile.mutateAsync(changes)
        // saved, whatever the pause does next: it isn't asked again, and Discard keeps it
        setState((s) => s && { ...s, stored: profileSaved(s.form, s.stored) })
      }
      if (pause) await updateRules.mutateAsync(pause)
      setState((s) => s && { ...s, stored: s.form })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  return {
    profile: profile.data,
    form,
    set: (change) => setState((s) => s && { ...s, form: { ...s.form, ...change } }),
    problems: problemsOf(form, stored),
    dirty: edited,
    valid: isValid(form, stored),
    saving,
    save,
    discard: () => setState((s) => s && { ...s, form: s.stored }),
  }
}
