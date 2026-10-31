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
 * The permission as the page knows it, and the one way to ask for it (from a click). It's read again when the tab
 * comes back to the front: someone who allowed or blocked notifications in the browser's settings and returned sees
 * the banner follow.
 */
export function useNotificationPermission(): [NotificationPermission, () => Promise<NotificationPermission>] {
  const notifications = useBrowserNotifications()
  const [permission, setPermission] = useState<NotificationPermission>(() => notifications.permission())

  useEffect(() => {
    const read = () => setPermission(notifications.permission())
    read()
    document.addEventListener('visibilitychange', read)
    return () => document.removeEventListener('visibilitychange', read)
  }, [notifications])

  const request = useCallback(async () => {
    const next = await notifications.request()
    setPermission(next)
    return next
  }, [notifications])

  return [permission, request]
}
