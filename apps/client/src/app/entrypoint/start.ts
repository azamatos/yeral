import { createMiddleware, createStart } from '@tanstack/react-start'
import { contentSecurityPolicy, cspNonce } from './csp'

/**
 * Every request gets a nonce: the router reads it (`getGlobalStartContext`, router.tsx) and puts it on the scripts
 * the server writes, and each page leaves with the Content Security Policy naming it (csp.ts). Vite's dev server adds
 * inline scripts of its own (React's refresh preamble), so in dev the header stays off.
 */
const contentSecurity = createMiddleware({ type: 'request' }).server(async ({ next }) => {
  const nonce = cspNonce()
  const result = await next({ context: { nonce } })
  if (!import.meta.env.DEV && result.response.headers.get('content-type')?.startsWith('text/html')) {
    result.response.headers.set('Content-Security-Policy', contentSecurityPolicy(nonce))
  }
  return result
})

export const startInstance = createStart(() => ({ requestMiddleware: [contentSecurity] }))
