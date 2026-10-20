/**
 * Where the login sends the person back (`/en/login?redirect=/en/account/profile`): only an address of this site in the
 * same language, never another site (`//evil.example`, `https://…`), nor a path out of the language, nor the login
 * itself (however it's spelled: `/en/./login`); else the language's Home.
 */
export function returnTo(lang: string, redirect: string | undefined): string {
  const home = `/${lang}`
  if (!redirect || redirect.includes('\\') || !redirect.startsWith(`${home}/`)) return home
  try {
    // resolved as a browser would: dot segments and escapes, and whether it stays on this origin
    const url = new URL(redirect, 'http://site.invalid')
    const { pathname } = url
    const stays = url.origin === 'http://site.invalid' && pathname.startsWith(`${home}/`)
    const login = pathname === `${home}/login` || pathname.startsWith(`${home}/login/`)
    return stays && !login ? `${pathname}${url.search}${url.hash}` : home
  } catch {
    return home
  }
}
