import { useMutation, useQuery } from '@tanstack/react-query'
import type { InternalStatus } from '@yeral/contract/settings'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

export type StatusToggles = {
  /** The statuses as loaded; `undefined` until they are (a failed refetch keeps them). */
  items: InternalStatus[] | undefined
  max: number | undefined
  failed: boolean
  /** On or off as the screen shows it: a flip not saved yet wins over what's stored. */
  enabled: (status: InternalStatus) => boolean
  flip: (status: InternalStatus, on: boolean) => void
  /** A flip waits for Save. */
  dirty: boolean
  saving: boolean
  /** Sends each flip to `PATCH …/settings/statuses/{id}`; false when one failed (the person heard why). */
  save: () => Promise<boolean>
  discard: () => void
}

/**
 * The internal statuses' switches as part of Booking rules' form (B-Settings: `flip` goes through the form, so the save
 * bar shows and Discard puts them back); adding and deleting a status save at once on their own.
 */
export function useStatusToggles(slug: string): StatusToggles {
  const sdk = useSdk()
  const errorText = useErrorText()
  const statuses = useQuery(sdk.settings.statuses(slug))
  const update = useMutation(sdk.settings.updateStatus(slug))
  // the flips not saved yet, by id; one flipped back to what's stored drops out
  const [flips, setFlips] = useState<Record<string, boolean>>({})
  const items = statuses.data?.items
  const changes = (items ?? []).filter((s) => s.id in flips && flips[s.id] !== s.enabled)

  return {
    items,
    max: statuses.data?.max,
    failed: !statuses.data && statuses.isError,
    enabled: (s) => flips[s.id] ?? s.enabled,
    flip: (s, on) =>
      setFlips((f) => {
        const next = { ...f }
        if (on === s.enabled) delete next[s.id]
        else next[s.id] = on
        return next
      }),
    dirty: changes.length > 0,
    saving: update.isPending,
    save: async () => {
      try {
        // one by one: the list refetches after each, and a failure stops with the rest still waiting
        for (const s of changes) {
          await update.mutateAsync({ id: s.id, enabled: flips[s.id] })
          setFlips((f) => {
            const next = { ...f }
            delete next[s.id]
            return next
          })
        }
        return true
      } catch (error) {
        toast(errorText(error))
        return false
      }
    },
    discard: () => setFlips({}),
  }
}
