import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { UsersRound } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'

/**
 * An invite waiting for someone already signed in (book B-08, which shows it at sign-in): a note at the top of the page,
 * in the place and shape of the shell's banners (B-Shell `.bnr`, accent like the notifications ask), whose Open leads
 * to the invite card. The oldest first, as the sign-in shows them; it goes once answered or expired.
 */
export function InviteNote() {
  const t = useTranslations('shell.invite')
  const invites = useQuery(useSdk().team.myInvites())
  const waiting = invites.data?.items.find((i) => i.state === 'pending')
  if (!waiting) return null
  return (
    <Callout
      tone="accent"
      icon={<UsersRound />}
      className="py-3 pr-3"
      action={
        <Button asChild variant="secondary" size="s">
          <Link to="/login">{t('open')}</Link>
        </Button>
      }
    >
      {t.rich('text', { business: waiting.business.name, b: (chunks) => <b>{chunks}</b> })}
    </Callout>
  )
}
