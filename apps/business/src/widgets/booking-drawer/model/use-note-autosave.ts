import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSdk } from '@/shared/api'

/** The pause in the typing after which the note goes to the api. */
const SETTLE_MS = 800

/**
 * The booking's internal note, saved whole as it's typed (book F-127, slice 4's gap 1): the api gets it once the
 * typing pauses, on leaving the field and on closing the drawer; a save that lands while more was typed is followed
 * by another; a failed one is tried again with the next change. `saved` is the api's note; what's typed stays on
 * screen while the calendar reads the booking again.
 */
export function useNoteAutosave({ slug, code, saved }: { slug: string; code: string; saved: string | null }) {
  const sdk = useSdk()
  const save = useMutation(sdk.calendar.setNote(slug))
  // what's typed since the drawer opened (null: nothing yet), what's typed and paused on, the last note the api took,
  // and the words a save failed for (tried again once they change)
  const [draft, setDraft] = useState<string | null>(null)
  const [settled, setSettled] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const known = sent ?? saved ?? ''

  // the pause in the typing
  useEffect(() => {
    if (draft === null) return
    const id = setTimeout(() => setSettled(draft), SETTLE_MS)
    return () => clearTimeout(id)
  }, [draft])

  // the settled words go when they differ from what the api has, one save at a time: a save that lands with newer
  // words settled is followed by another
  const { mutate, isPending } = save
  useEffect(() => {
    if (settled === null || settled === known || settled === failed || isPending) return
    mutate({ code, note: settled || null }, { onSuccess: () => setSent(settled), onError: () => setFailed(settled) })
  }, [settled, known, failed, isPending, mutate, code])

  // closing the drawer with words not sent yet: they go now (the mutation outlives the drawer)
  const latest = useRef({ draft, known, mutate, code })
  useEffect(() => {
    latest.current = { draft, known, mutate, code }
  })
  useEffect(
    () => () => {
      const l = latest.current
      if (l.draft !== null && l.draft !== l.known) l.mutate({ code: l.code, note: l.draft || null })
    },
    [],
  )

  const text = draft ?? saved ?? ''
  const dirty = draft !== null && draft !== known
  return {
    text,
    change: (next: string) => {
      setDraft(next)
      if (failed !== null && next !== failed) setFailed(null)
    },
    /** Leaving the field: what's typed goes without the pause. */
    blur: () => setSettled(draft),
    /** `failed` with the error, `saving` while on its way (or about to go), else `saved`. */
    state: failed !== null && dirty ? ('failed' as const) : dirty || isPending ? ('saving' as const) : ('saved' as const),
    error: save.error,
    /** Something was typed in this drawer: «saved», not «saved automatically». */
    typed: draft !== null,
  }
}
