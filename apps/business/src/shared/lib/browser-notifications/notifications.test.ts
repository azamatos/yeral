import { describe, expect, it, vi } from 'vitest'
import { BLOCKED_CLOSED_KEY, createBrowserNotifications, SOUND_URL, WARNED_KEY, type NotificationWindow } from './notifications'

/** A window with notifications the way a desktop browser has them; `permission` is what the person decided so far. */
function browser(permission: globalThis.NotificationPermission = 'default', answer: globalThis.NotificationPermission = 'granted') {
  const made: FakeNotification[] = []
  const store = new Map<string, string>()
  const play = vi.fn(() => Promise.resolve())
  const focus = vi.fn()
  const requestPermission = vi.fn(() => {
    FakeNotification.permission = answer
    return Promise.resolve(answer)
  })
  const audios: FakeAudio[] = []
  class FakeAudio {
    currentTime = 1
    play = play
    constructor(readonly src: string) {
      audios.push(this)
    }
  }
  class FakeNotification {
    static permission = permission
    static requestPermission = requestPermission
    onclick: (() => void) | null = null
    closed = false
    constructor(
      readonly title: string,
      readonly options?: NotificationOptions,
    ) {
      made.push(this)
    }
    close() {
      this.closed = true
    }
  }
  const win: NotificationWindow = {
    Notification: FakeNotification,
    isSecureContext: true,
    document: { hidden: false },
    focus,
    Audio: FakeAudio,
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
  }
  return { win, made, store, audios, play, focus, requestPermission, notifications: createBrowserNotifications(() => win) }
}

describe('createBrowserNotifications', () => {
  it('reads the permission from the browser, and «unsupported» where there are no notifications or no secure page', () => {
    expect(browser('default').notifications.permission()).toBe('default')
    expect(browser('granted').notifications.permission()).toBe('granted')
    expect(browser('denied').notifications.permission()).toBe('denied')
    expect(createBrowserNotifications(() => ({})).permission()).toBe('unsupported')
    const { win } = browser('granted')
    expect(createBrowserNotifications(() => ({ ...win, isSecureContext: false })).permission()).toBe('unsupported')
  })

  it('asks the browser only when told, and answers with what the person decided', async () => {
    const { requestPermission, notifications } = browser('default', 'denied')
    expect(requestPermission).not.toHaveBeenCalled()
    await expect(notifications.request()).resolves.toBe('denied')
    expect(requestPermission).toHaveBeenCalledOnce()
    await expect(createBrowserNotifications(() => ({})).request()).resolves.toBe('unsupported')
  })

  it('shows a notification while allowed; its click brings the tab to the front, closes it and opens the request', () => {
    const { focus, made, notifications } = browser('granted')
    const onClick = vi.fn()
    expect(notifications.show({ title: 'New request', body: 'Ejegyz T. · Aýna · today · 15:30', tag: 'new:YR-1', onClick })).toBe(true)
    expect(made).toHaveLength(1)
    expect(made[0]).toMatchObject({ title: 'New request', options: { body: 'Ejegyz T. · Aýna · today · 15:30', tag: 'new:YR-1' } })
    made[0]!.onclick?.()
    expect(focus).toHaveBeenCalledOnce()
    expect(made[0]!.closed).toBe(true)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows nothing before the permission is given, once it is blocked, or where the constructor refuses, and says so', () => {
    for (const p of ['default', 'denied'] as const) {
      const { made, notifications } = browser(p)
      expect(notifications.show({ title: 'New request', body: '', tag: 'new:YR-1' })).toBe(false)
      expect(made).toEqual([])
    }
    // Chrome on Android: notifications only through a service worker
    const { win } = browser('granted')
    class Refusing {
      static permission = 'granted' as const
      static requestPermission = () => Promise.resolve('granted' as const)
      constructor() {
        throw new TypeError('Illegal constructor')
      }
      close() {}
      onclick = null
    }
    const android = createBrowserNotifications(() => ({ ...win, Notification: Refusing }))
    expect(android.show({ title: 'New request', body: '', tag: 'new:YR-1' })).toBe(false)
  })

  it('remembers the warnings this tab gave through a reload: the newest 50, each code once', () => {
    const { win, notifications } = browser()
    const session = new Map<string, string>()
    win.sessionStorage = { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => void session.set(k, v) }
    expect(notifications.warningsHeard()).toEqual(new Set())
    notifications.markWarningHeard('YR-1')
    notifications.markWarningHeard('YR-2')
    notifications.markWarningHeard('YR-1')
    expect(createBrowserNotifications(() => win).warningsHeard()).toEqual(new Set(['YR-1', 'YR-2']))
    for (let i = 0; i < 60; i++) notifications.markWarningHeard(`YR-${100 + i}`)
    const heard = notifications.warningsHeard()
    expect(heard.size).toBe(50)
    expect(heard.has('YR-1')).toBe(false)
    expect(heard.has('YR-159')).toBe(true)
    // a tab whose storage is missing or holds rubbish starts afresh
    session.set(WARNED_KEY, '{oops')
    expect(notifications.warningsHeard()).toEqual(new Set())
    expect(createBrowserNotifications(() => ({})).warningsHeard()).toEqual(new Set())
  })

  it('plays the sound from the start each time, with one audio element, and stays quiet when the browser refuses', async () => {
    const { audios, play, notifications } = browser()
    notifications.sound()
    notifications.sound()
    expect(audios).toHaveLength(1)
    expect(audios[0]).toMatchObject({ src: SOUND_URL, currentTime: 0 })
    expect(play).toHaveBeenCalledTimes(2)
    play.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')))
    notifications.sound()
    await Promise.resolve()
    expect(() => createBrowserNotifications(() => ({})).sound()).not.toThrow()
  })

  it('tells whether the tab is in the background', () => {
    const { win, notifications } = browser()
    expect(notifications.hidden()).toBe(false)
    win.document!.hidden = true
    expect(notifications.hidden()).toBe(true)
    expect(createBrowserNotifications(() => ({})).hidden()).toBe(false)
  })

  it('keeps the closed «blocked» banner closed in this browser, and copes with a storage that refuses', () => {
    const { store, notifications } = browser('denied')
    expect(notifications.blockedBannerClosed()).toBe(false)
    notifications.closeBlockedBanner()
    expect(store.get(BLOCKED_CLOSED_KEY)).toBe('1')
    expect(notifications.blockedBannerClosed()).toBe(true)
    const refusing = createBrowserNotifications(() => ({
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError')
      },
    }))
    expect(refusing.blockedBannerClosed()).toBe(false)
    expect(() => refusing.closeBlockedBanner()).not.toThrow()
  })
})
