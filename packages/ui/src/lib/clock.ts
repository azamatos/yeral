import { useSyncExternalStore } from 'react'

/** How often the clock moves: a minute count off by at most this much. */
const STEP = 15_000

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
let now = stamp()

function stamp() {
  return Math.floor(Date.now() / STEP) * STEP
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    now = stamp()
    timer = setInterval(() => {
      now = stamp()
      for (const l of listeners) l()
    }, STEP)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) clearInterval(timer)
  }
}

// with nobody listening the clock isn't running: the time is read afresh (the same within a step)
const read = () => (listeners.size ? now : stamp())

/**
 * The time now (epoch ms, to 15 s), from one clock shared by everything on the page that shows a time counting down:
 * TimerPill, and a sentence beside it («18 min left to answer») that must agree with it. A component reading it draws
 * again every 15 s while it's on screen.
 */
export function useClock(): number {
  return useSyncExternalStore(subscribe, read, read)
}
