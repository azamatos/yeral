import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
let minute = Math.floor(Date.now() / 60_000)

/** One clock for every timer on the page: it ticks at each new minute while anything listens. */
function tick() {
  minute = Math.floor(Date.now() / 60_000)
  for (const listener of listeners) listener()
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    minute = Math.floor(Date.now() / 60_000)
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000))
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) clearTimeout(timer)
  }
}

/**
 * The time now, as of the current minute (epoch ms of its start): a component reading it draws again at each new
 * minute, every one of them on one shared timer (TimerPill's «re-renders every minute»).
 */
export function useMinute(): number {
  return useSyncExternalStore(
    subscribe,
    () => minute * 60_000,
    () => minute * 60_000,
  )
}
