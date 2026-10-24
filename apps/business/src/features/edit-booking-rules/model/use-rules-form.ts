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
  /** The buffer's «Other…» holds something that isn't 1–120 («Enter 1 to 120 minutes.»). */
  bufferInvalid: boolean
  /** Something to save or to discard; a buffer «Other…» that can't save counts. */
  dirty: boolean
  /** Nothing blocks the save. */
  valid: boolean
  /** A save is on its way: what's chosen meanwhile would be left out of it, so the controls wait. */
  saving: boolean
  /** Sends what changed to `PATCH …/settings/rules`; false when it failed (the person heard why in a toast). */
  save: () => Promise<boolean>
  /** Back to the saved rules. */
  discard: () => void
}

type State = { slug: string; form: RulesForm; stored: RulesForm; loadedAt: number }

/**
 * The business's booking rules as a form, for the wizard's rules step and Settings → Booking rules: loads them while
 * `on`, keeps the edits, saves only what changed. `null` until they load; a first load that failed throws (a failed
 * refetch keeps what's on screen). While nothing is edited the form follows the rules as they reload (another admin's
 * change, a live update); another business's slug starts it again. Only «Who answers requests?» needs the team: the
 * form doesn't wait for it, and without it (it didn't load) the question stays hidden and the setting keeps its value.
 */
export function useRulesForm(slug: string, on: boolean): RulesFormState | null {
  const sdk = useSdk()
  const errorText = useErrorText()
  const rules = useQuery({ ...sdk.settings.rules(slug), enabled: on })
  const team = useQuery({ ...sdk.team.list(slug), enabled: on, retry: false })
  const update = useMutation(sdk.settings.updateRules(slug))
  const [state, setState] = useState<State | null>(null)
  // the rules of the business on screen: a state left from another slug doesn't count
  const current = state?.slug === slug ? state : null
  const edited = !!current && (bufferProblem(current.form) || rulesUpdate(current.form, current.stored) !== null)
  if (on && rules.data && (!current || (!edited && !update.isPending && rules.dataUpdatedAt > current.loadedAt))) {
    const form = formFrom(rules.data)
    setState({ slug, form, stored: form, loadedAt: rules.dataUpdatedAt })
  }

  if (on && !current && !rules.data && rules.isError) throw rules.error
  if (!on || !current) return null
  const { form, stored } = current

  const save = async (): Promise<boolean> => {
    if (bufferProblem(form)) return false
    const changes = rulesUpdate(form, stored)
    // nothing to send; a typed buffer equal to the saved one goes back to its preset
    if (!changes) {
      setState((s) => s && { ...s, form: savedForm(s.form, s.stored) })
      return true
    }
    try {
      await update.mutateAsync(changes)
      const saved = savedForm(form, stored)
      setState((s) => s && { ...s, form: saved, stored: saved })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const bufferInvalid = bufferProblem(form)
  return {
    form,
    set: (change) => setState((s) => s && { ...s, form: { ...s.form, ...change } }),
    askWho: form.confirmMode === 'manual' && !!team.data && hasTeam(team.data.items),
    modeChanged: form.confirmMode !== stored.confirmMode,
    bufferInvalid,
    dirty: edited,
    valid: !bufferInvalid,
    saving: update.isPending,
    save,
    discard: () => setState((s) => s && { ...s, form: s.stored }),
  }
}
