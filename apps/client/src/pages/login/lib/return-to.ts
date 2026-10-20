/**
 * Where the login sends the person back (`/en/login?redirect=/en/account/profile`): only an address of this site in the
 * same language, never another site (`//evil.example`, `https://…`) nor a path out of the language; else the language's
 * Home.
 */
export function returnTo(lang: string, redirect: string | undefined): string {
  const home = `/${lang}`
  if (!redirect || redirect.includes('\\')) return home
  if (redirect === home) return home
  if (!redirect.startsWith(`${home}/`) || redirect.startsWith(`${home}/login`)) return home
  try {
    // a relative address that stays on this origin (rejects `/en/..//evil.example` and the like after resolving)
    const url = new URL(redirect, 'http://site.invalid')
    return url.origin === 'http://site.invalid' && url.pathname.startsWith(`${home}/`) ? `${url.pathname}${url.search}${url.hash}` : home
  } catch {
    return home
  }
}
