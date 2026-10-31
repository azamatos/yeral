import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSdk } from '@/shared/api'

/** The pause in the typing after which the note goes to the api. */
const SETTLE_MS = 800

/** Words typed (or sent) over the api's note as it was then: a note changed by a colleague meanwhile is told apart. */
type Over = { text: string; over: string | null }

/**
 * The booking's internal note, saved whole as it's typed (book F-127, slice 4's gap 1): the api gets it once the
 * typing pauses, on leaving the field and on closing the drawer; one save at a time, a save that lands while more was
 * typed is followed by another, a failed one is tried again with the next change. `saved` is the api's note; what's
 * typed stays on screen while the calendar reads the booking again, and a colleague's note arriving meanwhile
 * replaces an unsent draft instead of being overwritten by it.
 */
export function useNoteAutosave({ slug, code, saved }: { slug: string; code: string; saved: string | null }) {
  const sdk = useSdk()
  const save = useMutation(sdk.calendar.setNote(slug))
  // what's typed since the drawer opened (null: nothing yet), what's typed and paused on, the last note sent, and
  // the words a save failed for (tried again once they change)
  const [draft, setDraft] = useState<Over | null>(null)
  const [settled, setSettled] = useState<string | null>(null)
  const [sent, setSent] = useState<Over | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  // the api's note changed under the draft, and not by us: the colleague's words show, the draft goes
  const foreign = draft !== null && saved !== draft.over && saved !== sent?.text
  // what the api has, as far as this drawer knows: our last send while the draft is still over the same note
  const known = !foreign && sent && sent.over === draft?.over ? sent.text : (saved ?? '')
  const text = foreign || draft === null ? (saved ?? '') : draft.text

  // the pause in the typing
  useEffect(() => {
    if (draft === null) return
    const id = setTimeout(() => setSettled(draft.text), SETTLE_MS)
    return () => clearTimeout(id)
  }, [draft])

  // the settled words go when they differ from what the api has, one save at a time: a save that lands with newer
  // words settled is followed by another (`isPending` turning false runs this again)
  const { mutateAsync, isPending } = save
  const flight = useRef<{ text: string; done: Promise<unknown> } | null>(null)
  useEffect(() => {
    if (foreign || draft === null || settled === null || settled === known || settled === failed || isPending) return
    const over = draft.over
    const done = mutateAsync({ code, note: settled || null }).then(
      () => setSent({ text: settled, over }),
      () => setFailed(settled),
    )
    flight.current = { text: settled, done }
    void done.finally(() => {
      if (flight.current?.text === settled) flight.current = null
    })
  }, [foreign, draft, settled, known, failed, isPending, mutateAsync, code])

  // closing the drawer with words not sent yet: they go now, after a save still on its way (the mutation outlives
  // the drawer; the sdk's mutate from an unmounted drawer still runs)
  const latest = useRef({ text, known, foreign, draft })
  useEffect(() => {
    latest.current = { text, known, foreign, draft }
  })
  const { mutate } = save
  useEffect(
    () => () => {
      const l = latest.current
      if (l.foreign || l.draft === null || l.text === l.known) return
      const inFlight = flight.current
      if (inFlight?.text === l.text) return
      const send = () => mutate({ code, note: l.text || null })
      if (inFlight) void inFlight.done.then(send)
      else send()
    },
    [mutate, code],
  )

  const dirty = !foreign && draft !== null && draft.text !== known
  return {
    text,
    change: (next: string) => {
      setDraft({ text: next, over: saved })
      if (failed !== null && next !== failed) setFailed(null)
    },
    /** Leaving the field: what's typed goes without the pause. */
    blur: () => {
      if (draft !== null && !foreign) setSettled(draft.text)
    },
    /** `failed` with the error, `saving` while on its way (or about to go), else `saved`. */
    state: failed !== null && dirty ? ('failed' as const) : dirty || isPending ? ('saving' as const) : ('saved' as const),
    error: save.error,
    /** Something was typed in this drawer: «saved», not «saved automatically». */
    typed: draft !== null,
  }
}
