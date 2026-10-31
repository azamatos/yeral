import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { browserNotifications, type BrowserNotifications, type NotificationPermission } from './notifications'

const Context = createContext<BrowserNotifications>(browserNotifications)

/** The app runs on the browser's own (the default); a story or a test puts a fake here. */
export function BrowserNotificationsProvider({ value, children }: { value: BrowserNotifications; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useBrowserNotifications(): BrowserNotifications {
  return useContext(Context)
}

/**
 * The permission as the page knows it, and the one way to ask for it (from a click). It follows a change made
 * outside the banner (the browser's site settings, its address-bar bubble): through the Permissions API where the
 * browser has it, and when the tab comes back to the front everywhere.
 */
export function useNotificationPermission(): [NotificationPermission, () => Promise<NotificationPermission>] {
  const notifications = useBrowserNotifications()
  const [permission, setPermission] = useState<NotificationPermission>(() => notifications.permission())

  useEffect(() => {
    const read = () => setPermission(notifications.permission())
    read()
    document.addEventListener('visibilitychange', read)
    let status: PermissionStatus | null = null
    // an unknown permission name throws in some browsers, and an old one has no Permissions API at all
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((s) => {
        status = s
        s.addEventListener('change', read)
      })
      .catch(() => undefined)
    return () => {
      document.removeEventListener('visibilitychange', read)
      status?.removeEventListener('change', read)
    }
  }, [notifications])

  const request = useCallback(async () => {
    const next = await notifications.request()
    setPermission(next)
    return next
  }, [notifications])

  return [permission, request]
}
