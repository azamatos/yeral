import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { bufferProblem, formFrom, hasTeam, rulesUpdate, savedForm, type RulesForm } from './rules'

export type RulesFormState = {
  form: RulesForm
  set: (change: Partial<RulesForm>) => void
  /** «Who answers requests?» shows: manual mode, and someone besides the owner signs in (B-42). */
  askWho: boolean
  /** The confirmation mode differs from the saved one («Requests already waiting keep their timers…»). */
  modeChanged: boolean
  /** Something to save or to discard; a buffer «Other…» that can't save counts. */
  dirty: boolean
  /** Nothing blocks the save (the buffer). */
  valid: boolean
  /** A save is on its way: what's chosen meanwhile would be left out of it, so the controls wait. */
  saving: boolean
  /** Sends what changed to `PATCH …/settings/rules`; false when it failed (the person heard why in a toast). */
  save: () => Promise<boolean>
  /** Back to the saved rules. */
  discard: () => void
}

/**
 * The business's booking rules as a form, for the wizard's rules step and Settings → Booking rules: loads them while
 * `on`, keeps the edits, saves only what changed. `null` until they load; a first load that failed throws (a failed
 * refetch keeps what's on screen). Only «Who answers requests?» needs the team: the form doesn't wait for it, and
 * without it (it didn't load) the question stays hidden and the setting keeps its value.
 */
export function useRulesForm(slug: string, on: boolean): RulesFormState | null {
  const sdk = useSdk()
  const errorText = useErrorText()
  const rules = useQuery({ ...sdk.settings.rules(slug), enabled: on })
  const team = useQuery({ ...sdk.team.list(slug), enabled: on, retry: false })
  const update = useMutation(sdk.settings.updateRules(slug))
  const [state, setState] = useState<{ form: RulesForm; stored: RulesForm } | null>(null)
  if (on && !state && rules.data) {
    const form = formFrom(rules.data)
    setState({ form, stored: form })
  }

  if (on && !state && rules.isError) throw rules.error
  if (!on || !state) return null
  const { form, stored } = state

  const save = async (): Promise<boolean> => {
    if (bufferProblem(form)) return false
    const changes = rulesUpdate(form, stored)
    if (!changes) return true
    try {
      await update.mutateAsync(changes)
      const saved = savedForm(form, stored)
      setState({ form: saved, stored: saved })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const invalid = bufferProblem(form)
  return {
    form,
    set: (change) => setState((s) => s && { ...s, form: { ...s.form, ...change } }),
    askWho: form.confirmMode === 'manual' && !!team.data && hasTeam(team.data.items),
    modeChanged: form.confirmMode !== stored.confirmMode,
    dirty: invalid || rulesUpdate(form, stored) !== null,
    valid: !invalid,
    saving: update.isPending,
    save,
    discard: () => setState((s) => s && { ...s, form: s.stored }),
  }
}
