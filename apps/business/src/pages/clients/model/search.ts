import { CLIENT_SEGMENTS, type ClientSegment } from '@yeral/domain/clients'

/** The clients list's address (B-Clients, book B-32): the search, the chip, the add-client modal. */
export type ClientsSearch = { q?: string; segment?: ClientSegment; modal?: 'add' }

/** What's not a chip leaves «All». */
export function clientsSearch(search: Record<string, unknown>): ClientsSearch {
  const segment = CLIENT_SEGMENTS.find((s) => s === search.segment)
  return {
    ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
    ...(segment ? { segment } : {}),
    ...(search.modal === 'add' ? { modal: 'add' as const } : {}),
  }
}
