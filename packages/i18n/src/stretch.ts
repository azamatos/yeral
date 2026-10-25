/**
 * Longer words, for checking screens before their languages exist (book Q-101, plan P3): Russian runs about 30 % longer
 * than English, and its short labels much more («Add» → «Добавить»), so Storybook's «Text: Russian length» lengthens
 * every message that much. Off (1) everywhere else: the apps' messages pass through `stretched()`, which then returns
 * them as they are. Only Storybook calls `setTextStretch`.
 */
let factor = 1
let cache = new WeakMap<object, object>()

/** How much longer a long message reads (1: as written); shorter ones grow more (`stretchText`). */
export function setTextStretch(next: number): void {
  if (next === factor) return
  factor = next
  cache = new WeakMap()
}

/** The stretch now: the formatters made for one length aren't used at another. */
export const textStretch = () => factor

/** The index of the `}` that closes the `{` at `open`. */
function closing(text: string, open: number): number {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return i
  }
  return text.length - 1
}

/**
 * The letters a message shows of its own: its text, not the `<tags>` around it nor an `{argument}`'s value; of a plural
 * or a select, the longest branch (one shows at a time).
 */
export function ownLetters(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '<') {
      const end = text.indexOf('>', i)
      if (end > i) {
        i = end
        continue
      }
    }
    if (ch === '{') {
      const end = closing(text, i)
      const inner = text.slice(i + 1, end)
      let best = 0
      for (let j = 0; j < inner.length; j++)
        if (inner[j] === '{') {
          const stop = closing(inner, j)
          best = Math.max(best, ownLetters(inner.slice(j + 1, stop)))
          j = stop
        }
      n += best
      i = end
      continue
    }
    if (/\p{L}/u.test(ch)) n++
  }
  return n
}

/**
 * One message longer by the stretch, in whole words of filler after it, so lines break as real text does; added after
 * the whole message, never inside an `{argument}` or a `<tag>`. Russian lengthens short labels most: up to 4 letters
 * by 100 % (at 1.3), up to 10 by 60 %, up to 20 by 40 %, longer by 30 %. A message with no letters of its own («{name}
 * · {phone}») stays.
 */
export function stretchText(text: string, by = factor): string {
  const own = ownLetters(text)
  const scale = own <= 4 ? 10 / 3 : own <= 10 ? 2 : own <= 20 ? 4 / 3 : 1
  const extra = Math.round(own * (by - 1) * scale)
  if (extra < 1) return text
  const words: string[] = []
  for (let left = extra; left > 0; left -= 6) words.push('ж'.repeat(Math.min(6, left)))
  return `${text} ${words.join(' ')}`
}

/** Words that read the same in every language, or aren't read at all: the brand, file names. */
const KEPT = /^(brand|.*File)$/

function stretchAll(node: unknown, key = ''): unknown {
  if (typeof node === 'string') return KEPT.test(key) ? node : stretchText(node)
  if (Array.isArray(node)) return node.map((v) => stretchAll(v, key))
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, stretchAll(v, k)]))
  return node
}

/** The messages as they read now: each one longer by the stretch (once per messages object and stretch). */
export function stretched<T extends object>(messages: T): T {
  if (factor === 1) return messages
  let done = cache.get(messages)
  if (!done) cache.set(messages, (done = stretchAll(messages) as object))
  return done as T
}

// per app's own words (two apps share Storybook), then per shared words
const merged = new WeakMap<object, WeakMap<object, object>>()

/**
 * An app's words for a language: the shared namespaces with the app's own over them (made once per pair), as they read
 * now (`stretched`).
 */
export function appMessages<S extends object, A extends object>(shared: S, own: A): S & A {
  let byShared = merged.get(own)
  if (!byShared) merged.set(own, (byShared = new WeakMap()))
  let words = byShared.get(shared) as (S & A) | undefined
  if (!words) byShared.set(shared, (words = { ...shared, ...own }))
  return stretched(words)
}
