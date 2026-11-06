import { useState } from 'react'

/** The highlighted row of a list the input drives (↑ ↓ move it, Enter picks it), by its id, so new rows don't move it. */
export function useListbox(ids: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const index = activeId === null ? -1 : ids.indexOf(activeId)
  const active = index >= 0 ? activeId : null
  const move = (step: 1 | -1) => {
    if (ids.length === 0) return
    setActiveId(ids[index < 0 ? (step > 0 ? 0 : ids.length - 1) : (index + step + ids.length) % ids.length]!)
  }
  return { active, setActive: setActiveId, move, reset: () => setActiveId(null) }
}
export type Listbox = ReturnType<typeof useListbox>
