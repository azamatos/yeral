import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { LoginModal } from '@/features/log-in'
import { siteLocale } from '@/shared/i18n'
import { returnTo } from '../lib/return-to'

/**
 * `/{lang}/login` — the login's own address (client spec §3: the modal over the page; the address is the fallback, and
 * where a page that needs a sign-in sends the visitor with `?redirect=`). The modal opens over the site's chrome;
 * signed in, the person goes back to `redirect` (only an address of this site in this language) or Home; closed
 * without logging in, Home (the page that asked would only send them back here).
 */
export function LoginPage() {
  const { lang } = useParams({ strict: false })
  const { redirect } = useSearch({ strict: false })
  const navigate = useNavigate()
  const locale = siteLocale(lang)
  const go = (href: string) => void navigate({ href, replace: true })
  return <LoginModal open onOpenChange={(open) => !open && go(`/${locale}`)} onSignedIn={() => go(returnTo(locale, redirect))} />
}
