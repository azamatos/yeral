import type { BrowserNotifications, NotificationPermission, Notice } from './notifications'

/**
 * A browser that does as told, for stories and tests (the real prompt can't be driven from either): it starts at
 * `permission`, «Allow» ends at `answer`, and it remembers what was shown, played and closed. `hidden` puts the tab in
 * the background.
 */
export function fakeBrowserNotifications({
  permission = 'default',
  answer = 'granted',
  hidden = false,
  blockedClosed = false,
}: {
  permission?: NotificationPermission
  answer?: NotificationPermission
  hidden?: boolean
  blockedClosed?: boolean
} = {}) {
  const state = { permission, hidden, blockedClosed, shown: [] as Notice[], sounds: 0 }
  const fake: BrowserNotifications & { state: typeof state } = {
    state,
    permission: () => state.permission,
    request: () => {
      state.permission = answer
      return Promise.resolve(answer)
    },
    show: (notice) => {
      state.shown.push(notice)
    },
    sound: () => {
      state.sounds += 1
    },
    hidden: () => state.hidden,
    blockedBannerClosed: () => state.blockedClosed,
    closeBlockedBanner: () => {
      state.blockedClosed = true
    },
  }
  return fake
}
