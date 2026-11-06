import { useEffect, useState } from 'react'

/** The suggestions wait this long after the last letter (the board: «Loading (after 300 ms)»). */
export const SUGGEST_DELAY_MS = 300

/** `value` once it has stood still for `ms`: what's typed asks the api once per pause, not once per letter. */
export function useDebounced<T>(value: T, ms: number): T {
  const [kept, setKept] = useState(value)
  useEffect(() => {
    if (Object.is(kept, value)) return
    const timer = setTimeout(() => setKept(value), ms)
    return () => clearTimeout(timer)
  }, [kept, value, ms])
  return kept
}
