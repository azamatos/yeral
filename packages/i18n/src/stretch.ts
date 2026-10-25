/**
 * Longer words, for checking screens before their languages exist (book Q-101, plan P3): Russian runs about 30 %
 * longer than English, so Storybook's «Text: +30 %» lengthens every message by that much. Off (1) everywhere else; the
 * apps pass their messages through `stretched()`, which is then the messages themselves.
 */
let factor = 1
let cache = new WeakMap<object, object>()

/** How much longer every message reads (1: as written). */
export function setTextStretch(next: number): void {
  if (next === factor) return
  factor = next
  cache = new WeakMap()
}

/**
 * The words a message writes itself: its text and its plural or select branches' (even depths), not its `{arguments}`
 * (odd depths: their names and values aren't translated).
 */
function literalLength(text: string): number {
  let depth = 0
  let n = 0
  for (const ch of text) {
    if (ch === '{') depth++
    else if (ch === '}') depth = Math.max(0, depth - 1)
    else if (depth % 2 === 0) n++
  }
  return n
}

/**
 * One message longer by the stretch: whole words of filler after it, so lines break as real text does. Added after the
 * whole message, never inside an `{argument}` or a `<tag>`; only its own words count («{name} · {phone}» stays).
 */
export function stretchText(text: string, by = factor): string {
  const own = literalLength(text)
  const extra = own < 4 ? 0 : Math.round(own * (by - 1))
  if (extra < 1) return text
  const words: string[] = []
  for (let left = extra; left > 0; left -= 7) words.push('ж'.repeat(Math.min(6, left)))
  return `${text} ${words.join(' ')}`
}

function stretchAll(node: unknown): unknown {
  if (typeof node === 'string') return stretchText(node)
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, stretchAll(v)]))
  return node
}

/** The messages as they read now: each one longer by the stretch (once per messages object and stretch). */
export function stretched<T extends object>(messages: T): T {
  if (factor === 1) return messages
  let done = cache.get(messages)
  if (!done) cache.set(messages, (done = stretchAll(messages) as object))
  return done as T
}
