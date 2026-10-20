import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { LogOut } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { textLink } from '@/shared/ui'

/**
 * «You: Gülnar Öwezowa · +993 64 •• •• 90 · Log in with another number» under every step after the code (B-Login
 * `.acc`): who is signed in, and the way out to sign in with another number. The expired invite draws the way out as
 * a ghost button with an icon.
 */
export function AccountLine({
  who,
  onOtherNumber,
  busy,
  ghost,
}: {
  who: string
  onOtherNumber: () => void
  busy?: boolean
  ghost?: boolean
}) {
  const t = useTranslations('login')
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-n-200 pt-4">
      <span className="text-dense text-n-600 [&_b]:font-semibold [&_b]:whitespace-nowrap [&_b]:text-n-900 [&_b]:tabular-nums">
        {t.rich('you', { who, b: (chunks) => <b>{chunks}</b> })}
      </span>
      {ghost ? (
        <Button variant="ghost" className="-mr-3" loading={busy} onClick={onOtherNumber}>
          <LogOut aria-hidden />
          {t('otherNumber')}
        </Button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onOtherNumber}
          className={cn(textLink, 'hit inline-flex min-h-8 items-center text-small')}
        >
          {t('otherNumber')}
        </button>
      )}
    </div>
  )
}
