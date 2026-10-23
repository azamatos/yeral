import { useEffect, useState } from 'react'

/** The value once it has stopped changing for `ms`: a search asked after a pause in the typing, not at every letter. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return settled
}
