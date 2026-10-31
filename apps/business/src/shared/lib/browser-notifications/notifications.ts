import { brand } from '@yeral/ui/brand'

/**
 * Where the browser stands on notifications from this app: not asked yet (`default`), allowed, blocked, or none on
 * this browser (`unsupported`: no `Notification` at all, as on an iPhone outside an installed app, or a page that isn't
 * secure).
 */
export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported'

/** What a notification says and does; the `tag` keeps one per request, so a second word about it replaces the first. */
export interface Notice {
  title: string
  body: string
  tag: string
  /** After the browser brought the tab to the front: open what the notice is about. */
  onClick?: () => void
}

/**
 * The browser's notifications and the soft sound, behind one door (book S-16, F-170; the owner's choice D1 of
 * `log/2026-10-31-slice-4-plan.md`): the shell's banner asks and reads the permission here, the arrivals play the
 * sound and show the notification here, and a story or a test swaps the whole thing for a fake
 * (`fakeBrowserNotifications`), since the browser's own prompt can't be driven from a test.
 */
export interface BrowserNotifications {
  permission(): NotificationPermission
  /** Opens the browser's own prompt: only from a click on «Allow», never on load (decision 7 of the slice 4 plan). */
  request(): Promise<NotificationPermission>
  /** A notification, while allowed; its click brings the tab to the front, closes it and runs `onClick`. */
  show(notice: Notice): void
  /** The soft sound; quiet when the browser refuses to play without a gesture or the file didn't load. */
  sound(): void
  /** Is the tab in the background (`document.hidden`): then the notification speaks, not the toast. */
  hidden(): boolean
  /** The «blocked» banner was closed in this browser: it stays closed (per browser, no account setting). */
  blockedBannerClosed(): boolean
  closeBlockedBanner(): void
}

/** The sound file in `public/`: a short two-note chime made by hand (no licence to carry), 16 kHz mono, 16 KB. */
export const SOUND_URL = '/sounds/new-request.wav'
/** The flag's name in the browser's storage. */
export const BLOCKED_CLOSED_KEY = 'yeral.business.notifications.blocked-closed'

/** What the browser driver reads of the window (tests pass their own). */
export interface NotificationWindow {
  Notification?: {
    permission: globalThis.NotificationPermission
    requestPermission(): Promise<globalThis.NotificationPermission>
    new (title: string, options?: NotificationOptions): Pick<globalThis.Notification, 'close' | 'onclick'>
  }
  isSecureContext?: boolean
  document?: { hidden: boolean }
  focus?(): void
  Audio?: new (src: string) => Pick<HTMLAudioElement, 'play' | 'currentTime'>
  localStorage?: Pick<Storage, 'getItem' | 'setItem'>
}

/**
 * The driver over the real browser (the default; `window` in the app, `globalThis` elsewhere). Everything is read
 * when asked, never at import, so a module loaded on a server or in a unit test stays quiet.
 */
export function createBrowserNotifications(win: () => NotificationWindow = () => globalThis): BrowserNotifications {
  let audio: Pick<HTMLAudioElement, 'play' | 'currentTime'> | null = null
  const storage = () => {
    try {
      return win().localStorage ?? null
    } catch {
      // storage access refused (a private window, blocked site data): the flag can't be kept
      return null
    }
  }
  const permission = (): NotificationPermission => {
    const w = win()
    if (!w.Notification || w.isSecureContext === false) return 'unsupported'
    return w.Notification.permission
  }
  return {
    permission,
    async request() {
      const w = win()
      if (!w.Notification || w.isSecureContext === false) return 'unsupported'
      try {
        await w.Notification.requestPermission()
      } catch {
        // an old Safari takes a callback and returns nothing to await: the state below says what happened
      }
      return permission()
    },
    show({ title, body, tag, onClick }) {
      const w = win()
      if (permission() !== 'granted' || !w.Notification) return
      try {
        const n = new w.Notification(title, { body, tag, icon: brand.touchIcon })
        n.onclick = () => {
          w.focus?.()
          n.close()
          onClick?.()
        }
      } catch {
        // Chrome on Android has notifications only through a service worker (`Illegal constructor`): nothing to show
      }
    },
    sound() {
      const w = win()
      if (!w.Audio) return
      try {
        audio ??= new w.Audio(SOUND_URL)
        audio.currentTime = 0
        void audio.play().catch(() => undefined)
      } catch {
        // no audio here
      }
    },
    hidden: () => win().document?.hidden ?? false,
    blockedBannerClosed() {
      try {
        return storage()?.getItem(BLOCKED_CLOSED_KEY) === '1'
      } catch {
        return false
      }
    },
    closeBlockedBanner() {
      try {
        storage()?.setItem(BLOCKED_CLOSED_KEY, '1')
      } catch {
        // storage full or refused: the banner closes for this page at least
      }
    },
  }
}

/** The app's driver: the browser this page runs in. */
export const browserNotifications = createBrowserNotifications()
