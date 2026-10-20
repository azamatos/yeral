import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { createApi } from '@yeral/sdk'
import { apiUrl } from '@/shared/config'

/**
 * The visitor's session cookie, passed on when the server renders a page for them, so the header and the pages know who
 * is signed in from the first byte; the browser sends its own.
 */
const visitorHeaders = createIsomorphicFn()
  .server((): Record<string, string> => {
    const cookie = getRequestHeader('cookie')
    return cookie ? { cookie } : {}
  })
  .client((): Record<string, string> => ({}))

/** The site's api and cache: one per request on the server (nothing leaks between visitors), one in the browser. */
export const createSiteApi = () => createApi({ baseUrl: apiUrl(), headers: visitorHeaders })
