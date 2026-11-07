import {
  CLIENT_SORTS,
  CLIENT_TAG_FILTER_MAX,
  CLIENT_UPCOMING,
  SORT_DIRS,
  type ClientSort,
  type ClientUpcoming,
  type SortDir,
} from '@yeral/contract/clients'
import { CLIENT_SEGMENTS, CLIENT_TAG_MAX, type ClientSegment } from '@yeral/domain/clients'

/**
 * The clients list's address (B-Clients, book B-32; design v0.7 B5): the search, the chip, the tags (any of them),
 * Upcoming booking, the sort and its direction, the add-client modal.
 */
export type ClientsSearch = {
  q?: string
  segment?: ClientSegment
  tag?: string[]
  upcoming?: ClientUpcoming
  sort?: ClientSort
  dir?: SortDir
  modal?: 'add'
}

/** One tag or a list of them (`?tag=VIP` typed by hand, or the list the bar writes): trimmed, each once, the api's limits. */
function tagsOf(value: unknown): string[] {
  const list = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string')
  const tags = [...new Set(list.map((v) => v.trim()).filter((v) => v && v.length <= CLIENT_TAG_MAX))]
  return tags.slice(0, CLIENT_TAG_FILTER_MAX)
}

/** What's not a chip leaves «All»; what's not a sort leaves the usual order, and a direction without a sort goes. */
export function clientsSearch(search: Record<string, unknown>): ClientsSearch {
  const segment = CLIENT_SEGMENTS.find((s) => s === search.segment)
  const tag = tagsOf(search.tag)
  const upcoming = CLIENT_UPCOMING.find((u) => u === search.upcoming)
  const sort = CLIENT_SORTS.find((s) => s === search.sort)
  const dir = sort && SORT_DIRS.find((d) => d === search.dir)
  return {
    ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
    ...(segment ? { segment } : {}),
    ...(tag.length ? { tag } : {}),
    ...(upcoming ? { upcoming } : {}),
    ...(sort ? { sort } : {}),
    ...(dir ? { dir } : {}),
    ...(search.modal === 'add' ? { modal: 'add' as const } : {}),
  }
}
