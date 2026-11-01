import { Link } from '@tanstack/react-router'
import { textLink } from '@yeral/ui/text-link'
import { useLocale, useTranslations } from 'use-intl'

/** The line under a step that makes an account or a booking (Auth, Booking): new tabs, so the step stays as it was. */
export function TermsNote({ word }: { word: 'login' | 'booking' }) {
  const t = useTranslations('pages.agree')
  const lang = useLocale()
  return (
    <p className="m-0 text-dense text-n-600">
      {t.rich(word, {
        terms: (chunks) => (
          <Link to="/$lang/terms" params={{ lang }} target="_blank" className={textLink}>
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link to="/$lang/privacy" params={{ lang }} target="_blank" className={textLink}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  )
}
