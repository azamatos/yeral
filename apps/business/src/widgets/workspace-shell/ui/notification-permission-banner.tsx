import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Bell, BellOff, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useBrowserNotifications, useNotificationPermission } from '@/shared/lib/browser-notifications'

/**
 * The shell's notifications banner (B-Shell «5 · Notifications · ask», «6 · blocked»; DS-Business 07
 * NotificationPermissionBanner; book F-170): under the business status banner's place at the top of every workspace
 * page, for everyone who gets notifications here (the list of requests is already the person's own). Not asked yet:
 * the accent line «Turn on notifications to hear new requests.» + Allow, which opens the browser's own prompt (never
 * on load) and goes once it's answered. Blocked: the quiet line «Notifications are blocked in this browser…» with
 * Close, which stays closed in this browser. Allowed, or a browser without notifications: nothing.
 */
export function NotificationPermissionBanner() {
  const t = useTranslations('shell.notifications')
  const notifications = useBrowserNotifications()
  const [permission, request] = useNotificationPermission()
  const [closed, setClosed] = useState(() => notifications.blockedBannerClosed())

  if (permission === 'default') {
    return (
      <Callout
        tone="accent"
        icon={<Bell />}
        live
        className="py-3 pr-3"
        action={
          <Button variant="secondary" size="s" onClick={() => void request()}>
            {t('allow')}
          </Button>
        }
      >
        {t.rich('ask', { b: (chunks) => <b>{chunks}</b> })}
      </Callout>
    )
  }
  if (permission === 'denied' && !closed) {
    return (
      <Callout
        tone="neutral"
        icon={<BellOff />}
        live
        className="py-3 pr-3"
        action={
          <Button
            variant="ghost"
            size="s"
            iconOnly
            aria-label={t('close')}
            onClick={() => {
              notifications.closeBlockedBanner()
              setClosed(true)
            }}
          >
            <X />
          </Button>
        }
      >
        {t('blocked')}
      </Callout>
    )
  }
  return null
}
