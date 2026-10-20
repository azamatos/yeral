import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { Logo } from '@yeral/ui/brand'
import { Button } from '@yeral/ui/button'
import { LanguageSwitcher } from '@yeral/ui/language-switcher'
import { NavLink } from '@yeral/ui/nav-link'
import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { LoginModal } from '@/features/log-in'
import { site } from '@/shared/config'
import { SITE_LOCALES } from '@/shared/i18n'
import { wrap } from '@/shared/ui'
import { useSwitchLanguage } from '../model/use-switch-language'
import { AccountMenu, visibleAccountTrigger } from './account-menu'

/**
 * The marketing header (Home, Auth «Logged-in header», States 09): the logo home, «For business», the language (none
 * with one language) and «Log in», or the avatar and its menu once someone is signed in. 72 high; 56 with a 24 logo on
 * phones (Mobile frame 1), where «For business» goes (Home `.hide-xs`).
 */
export function SiteHeader() {
  const t = useTranslations()
  const locale = useLocale()
  const sdk = useSdk()
  const me = useQuery(sdk.me.get())
  const switchLanguage = useSwitchLanguage()
  const [loggingIn, setLoggingIn] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const logInRef = useRef<HTMLAnchorElement>(null)
  const brand = t('common.brand')

  return (
    <header className="border-b border-n-200 bg-n-0">
      <div className={`${wrap} flex h-18 items-center gap-4 max-sm:h-14`}>
        <Link
          to="/$lang"
          params={{ lang: locale }}
          aria-label={t('site.home', { brand })}
          className="flex flex-none rounded-s focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Logo alt={brand} height={30} className="max-sm:h-6! max-sm:w-auto" />
        </Link>
        <div className="flex-1" />
        <nav ref={navRef} className="flex items-center gap-1">
          <NavLink href={site.urls.business} className="max-sm:hidden">
            {t('site.forBusiness')}
          </NavLink>
          <LanguageSwitcher
            value={locale}
            onValueChange={switchLanguage}
            actionLabel={t('site.language')}
            options={SITE_LOCALES.map((l) => ({ value: l, name: t(`site.languages.${l}`) }))}
            className="max-sm:hidden"
          />
          {/* until the visitor is known (a failed check too), «Log in»: it works either way */}
          {me.data ? (
            <AccountMenu me={me.data} />
          ) : (
            <Button asChild variant="secondary" size="s">
              {/* the login's address without JavaScript; with it, the modal over this page (client spec §3) */}
              <Link
                ref={logInRef}
                to="/$lang/login"
                params={{ lang: locale }}
                onClick={(e) => {
                  e.preventDefault()
                  setLoggingIn(true)
                }}
              >
                {t('site.logIn')}
              </Link>
            </Button>
          )}
        </nav>
      </div>
      <LoginModal
        open={loggingIn}
        onOpenChange={setLoggingIn}
        onSignedIn={() => setLoggingIn(false)}
        // back on «Log in»; once someone is signed in it's gone, and the avatar that took its place has the focus
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          ;(visibleAccountTrigger(navRef.current) ?? logInRef.current)?.focus()
        }}
      />
    </header>
  )
}
