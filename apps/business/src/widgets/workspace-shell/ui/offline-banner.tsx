import { Callout } from '@yeral/ui/callout'
import { useSyncExternalStore } from 'react'
import { useTranslations } from 'use-intl'

const subscribe = (change: () => void) => {
  window.addEventListener('online', change)
  window.addEventListener('offline', change)
  return () => {
    window.removeEventListener('online', change)
    window.removeEventListener('offline', change)
  }
}

/**
 * «You're offline» over the page (book F-096, slice 4's decision 11): the installed app opens from its cache with no
 * connection, and nothing it shows then can be fresh, so it says so until the connection is back.
 */
export function OfflineBanner() {
  const t = useTranslations('shell')
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  if (online) return null
  return (
    <Callout tone="warning" live className="m-3">
      {t('offline')}
    </Callout>
  )
}
