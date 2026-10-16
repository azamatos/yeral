import { ZONE } from '@yeral/domain/time'
import { describe, expect, it, vi } from 'vitest'

const locale = vi.hoisted(() => ({ current: 'tk' }))
vi.mock('use-intl', () => ({ useLocale: () => locale.current }))

const { DEFAULT_LOCALE, TIME_ZONE, useFmt } = await import('./index')

describe('useFmt', () => {
  it('keeps one formatter per locale instead of building one every render', () => {
    locale.current = 'ru'
    const first = useFmt()
    expect(useFmt()).toBe(first)
    expect(first.locale).toBe('ru')
  })

  it('falls back to the default locale', () => {
    locale.current = 'de'
    expect(useFmt().locale).toBe(DEFAULT_LOCALE)
  })
})

describe('time zone', () => {
  it('is the business zone from @yeral/domain/time', () => {
    expect(TIME_ZONE).toBe(ZONE)
  })
})
