import { CLIENT_SORTS, SORT_DIRS, type ClientSort, type SortDir } from '@yeral/contract/clients'
import { CLIENT_SEGMENTS, type ClientSegment } from '@yeral/domain/clients'

/** The clients list's address (B-Clients, book B-32): the search, the chip, the sort and its direction, the add-client modal. */
export type ClientsSearch = { q?: string; segment?: ClientSegment; sort?: ClientSort; dir?: SortDir; modal?: 'add' }

/** What's not a chip leaves «All»; what's not a sort leaves the usual order, and a direction without a sort goes. */
export function clientsSearch(search: Record<string, unknown>): ClientsSearch {
  const segment = CLIENT_SEGMENTS.find((s) => s === search.segment)
  const sort = CLIENT_SORTS.find((s) => s === search.sort)
  const dir = sort && SORT_DIRS.find((d) => d === search.dir)
  return {
    ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
    ...(segment ? { segment } : {}),
    ...(sort ? { sort } : {}),
    ...(dir ? { dir } : {}),
    ...(search.modal === 'add' ? { modal: 'add' as const } : {}),
  }
}
