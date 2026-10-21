import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

/** The languages the phone or browser asks for, in `Accept-Language`'s form: the request's on the server, the browser's own. */
export const visitorLanguages = createIsomorphicFn()
  .server((): string | null => getRequestHeader('accept-language') ?? null)
  .client((): string | null => navigator.languages.join(','))
