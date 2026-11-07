import type { BusinessDetail } from '@yeral/contract/catalog'

type Group = BusinessDetail['serviceGroups'][number]
type Service = Group['services'][number]

/** The group index (1440) and the phone's rail come from 3 groups (Venue v0.7 · C3 «The index and the phone rail appear from 3 groups»). */
export const GROUPS_FROM = 3
/** The search inside the services from 9 (DS · Lists FilterBar rule: search when there are more than 8). */
export const SEARCH_FROM = 9

/** Where the words sit in a text, as `slice` reads it. */
export interface Match {
  start: number
  end: number
}

/** One letter as the search reads it: lower-case, its accent gone («ý» = «y», «ş» = «s», «ё» = «е»). */
function foldChar(ch: string): string {
  const base = ch.normalize('NFD').replace(/\p{M}/gu, '') || ch
  return Array.from(base.toLocaleLowerCase())[0] ?? ch
}

/**
 * Where the query sits in the text, case and accents aside («colour» finds «Colour correction», «yuw» finds «Ýuwmak»);
 * null when it doesn't. Letters fold one by one, so the match points back into the text as written.
 */
export function matchIn(text: string, query: string): Match | null {
  const q = Array.from(query.trim()).map(foldChar).join('')
  if (!q) return null
  let folded = ''
  // for each unit of the folded text, where its letter begins in the text
  const origin: number[] = []
  let at = 0
  for (const ch of text) {
    const f = foldChar(ch)
    for (let i = 0; i < f.length; i++) origin.push(at)
    folded += f
    at += ch.length
  }
  origin.push(at)
  const from = folded.indexOf(q)
  if (from < 0) return null
  return { start: origin[from]!, end: origin[from + q.length]! }
}

export interface ServiceMatch {
  service: Service
  /** The words found in the name and the description (for the 700 mark); null outside a search. */
  name: Match | null
  description: Match | null
}

export interface GroupResult {
  group: Group
  /** The group's services to list: every one outside a search, the matching ones in it (none greys the group out). */
  services: ServiceMatch[]
}

export interface SearchResult {
  groups: GroupResult[]
  /** The services listed. */
  count: number
  /** The groups with something to list. */
  groupCount: number
  searching: boolean
}

/**
 * The services as the browser lists them (Venue v0.7 · C3 `ServiceSearch`): whole outside a search; in one, the
 * services whose name or description holds the words, still in their groups («results stay grouped»), every group kept
 * so the index can show its count («Groups without matches stay in the index, greyed with 0, so nothing jumps»).
 */
export function searchServices(groups: readonly Group[], query: string): SearchResult {
  const searching = query.trim().length > 0
  const out = groups.map((group) => ({
    group,
    services: group.services.flatMap((service): ServiceMatch[] => {
      if (!searching) return [{ service, name: null, description: null }]
      const name = matchIn(service.name, query)
      const description = service.description ? matchIn(service.description, query) : null
      return name || description ? [{ service, name, description }] : []
    }),
  }))
  return {
    groups: out,
    count: out.reduce((n, g) => n + g.services.length, 0),
    groupCount: out.filter((g) => g.services.length > 0).length,
    searching,
  }
}
