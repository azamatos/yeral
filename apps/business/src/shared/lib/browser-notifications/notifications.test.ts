import { describe, expect, it, vi } from 'vitest'
import { BLOCKED_CLOSED_KEY, createBrowserNotifications, SOUND_URL, type NotificationWindow } from './notifications'

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
    notifications.show({ title: 'New request', body: 'Ejegyz T. · Aýna · today · 15:30', tag: 'new:YR-1', onClick })
    expect(made).toHaveLength(1)
    expect(made[0]).toMatchObject({ title: 'New request', options: { body: 'Ejegyz T. · Aýna · today · 15:30', tag: 'new:YR-1' } })
    made[0]!.onclick?.()
    expect(focus).toHaveBeenCalledOnce()
    expect(made[0]!.closed).toBe(true)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows nothing before the permission is given or once it is blocked', () => {
    for (const p of ['default', 'denied'] as const) {
      const { made, notifications } = browser(p)
      notifications.show({ title: 'New request', body: '', tag: 'new:YR-1' })
      expect(made).toEqual([])
    }
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
