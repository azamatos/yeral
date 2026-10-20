import { createIsomorphicFn } from '@tanstack/react-start'
import { appendResponseHeader, getRequestHeader } from '@tanstack/react-start/server'
import { createApi, type Api } from '@yeral/sdk'
import { apiUrl, site } from '@/shared/config'

/** The session cookie's name and `=`, as a `Cookie` header carries it. */
const SESSION = `${site.cookiePrefix}.session=`

/**
 * The visitor's cookie, passed on when the server renders a page for them, so the header and the pages know who is
 * signed in from the first byte; the browser sends its own.
 */
const visitorHeaders = createIsomorphicFn()
  .server((): Record<string, string> => {
    const cookie = getRequestHeader('cookie')
    return cookie ? { cookie } : {}
  })
  .client((): Record<string, string> => ({}))

/**
 * On the server, a cookie the api sets (a session renewed under 30 days left, ADR 0019) goes on to the browser with the
 * page; otherwise the renewal would be lost and an active visitor signed out when the old cookie runs out.
 */
const siteFetch = createIsomorphicFn()
  .server((): typeof fetch => async (input, init) => {
    const response = await fetch(input, init)
    for (const cookie of response.headers.getSetCookie()) appendResponseHeader('set-cookie', cookie)
    return response
  })
  .client((): typeof fetch | undefined => undefined)

/** The site's api and cache: one per request on the server (nothing leaks between visitors), one in the browser. */
export const createSiteApi = () => createApi({ baseUrl: apiUrl(), headers: visitorHeaders, fetch: siteFetch() })

/** How long a page waits on the server to know who is signed in before it renders with «Log in». */
const WHO_WAIT_MS = 1500

/**
 * Who is signed in, for the header and `/`'s language, without ever holding a page up: on the server, nobody without a
 * session cookie (no api call), else one try, at most 1.5 s; in the browser, asked in the background.
 */
export const knowVisitor = createIsomorphicFn()
  .server(async ({ queryClient, sdk }: Api): Promise<void> => {
    if (!getRequestHeader('cookie')?.includes(SESSION)) {
      queryClient.setQueryData(sdk.me.get().queryKey, null)
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      queryClient.prefetchQuery({ ...sdk.me.get(), retry: false }),
      new Promise<void>((resolve) => (timer = setTimeout(resolve, WHO_WAIT_MS))),
    ])
    clearTimeout(timer)
  })
  .client(({ queryClient, sdk }: Api): Promise<void> => {
    void queryClient.prefetchQuery(sdk.me.get())
    return Promise.resolve()
  })
