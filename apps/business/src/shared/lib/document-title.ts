import { useEffect } from 'react'
import { useTranslations } from 'use-intl'

/**
 * The tab's title: the page's own parts, then the app's name, joined the way the design writes them («Calendar · Glow
 * Studio», «Page not found · Ýeral Business»).
 */
export function usePageTitle(...parts: (string | null | undefined | false)[]) {
  const t = useTranslations()
  const title = [...parts, t('app.name', { brand: t('common.brand') })].filter(Boolean).join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}
