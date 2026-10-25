import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { Workspace } from '@yeral/contract/team'
import { formatPhone } from '@yeral/domain/phone'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { toast } from '@yeral/ui/toast'
import { Store } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AccountLine } from '@/features/sign-in'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage, iconTile } from '@/shared/ui'

/**
 * "You already have a business" (the owner, 25.10.2026; book B-02, B-10): someone already in a workspace who opens the
 * setup without a draft, and without asking to create another (the switcher's «Create a business» does), picks first:
 * one of their businesses, as the switcher's rows show them (logo or letter tile, name, «level · city»), opens at its
 * calendar; «Create another business» goes on to the business step, since a second address is a business of its own
 * (design §28.5). On the sign-in's frame, with its account line, as the login's other choices (B-Login): signed in with
 * the wrong number, «Log in with another number» signs out and the wizard's step 1 opens.
 */
export function HasBusiness({ me, workspaces }: { me: Me; workspaces: Workspace[] }) {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const logout = useMutation(sdk.auth.logout())
  usePageTitle(t('setup.hasBusiness.title', { count: workspaces.length }))
  const name = me.name ?? me.firstName
  const phone = formatPhone(me.phone)
  return (
    <AuthPage
      focusKey="has-business"
      media={
        <span aria-hidden className={iconTile}>
          <Store />
        </span>
      }
      title={t('setup.hasBusiness.title', { count: workspaces.length })}
      lead={t('setup.hasBusiness.lead', { count: workspaces.length })}
    >
      <ul aria-label={t('setup.hasBusiness.list')} className="m-0 flex list-none flex-col p-0">
        {workspaces.map((w) => (
          <li key={w.slug} className="flex min-h-16 items-center gap-3 border-b border-n-200 py-2.5 first:border-t">
            <Avatar decorative name={w.name} src={w.logo?.url} size={36} shape="square" tone="neutral" letters={1} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] leading-5 font-semibold text-n-900">{w.name}</span>
              <span className="truncate text-small text-n-600">
                {t('shell.where', { level: t(`levels.${w.level}`), city: w.city.name })}
              </span>
            </span>
            <Button asChild variant="tint" size="s">
              <Link to="/w/$slug/calendar" params={{ slug: w.slug }} aria-label={t('setup.hasBusiness.openLabel', { name: w.name })}>
                {t('setup.hasBusiness.open')}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      <Button asChild variant="secondary" size="l" className="w-full">
        <Link to="/setup/$step" params={{ step: 'business' }} search={{ another: true }}>
          {t('setup.hasBusiness.create')}
        </Link>
      </Button>
      <AccountLine
        who={name ? t('login.who', { name, phone }) : phone}
        // signed out, the setup opens its step 1 by itself
        onOtherNumber={() => logout.mutate(undefined, { onError: (error) => void toast(errorText(error)) })}
        busy={logout.isPending}
      />
    </AuthPage>
  )
}
