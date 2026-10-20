/** Rows in their lists by a key, in their order. */
export function groupBy<T>(rows: readonly T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const r of rows) {
    const list = out.get(key(r))
    if (list) list.push(r)
    else out.set(key(r), [r])
  }
  return out
}
