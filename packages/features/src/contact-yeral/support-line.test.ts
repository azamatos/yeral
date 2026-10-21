import { MARKET } from '@yeral/domain/market'
import { describe, expect, it } from 'vitest'
import { SUPPORT_LINE, supportLinks } from './support-line'

describe('the support line', () => {
  it('is written as the market writes numbers and linked to call and to Telegram', () => {
    expect(SUPPORT_LINE.phoneHref).toBe(`tel:${MARKET.support.phone}`)
    expect(SUPPORT_LINE.phone.replace(/\s/g, '')).toBe(MARKET.support.phone)
    expect(SUPPORT_LINE.telegram).toBe(`@${MARKET.support.telegram}`)
    expect(SUPPORT_LINE.telegramHref).toBe(`https://t.me/${MARKET.support.telegram}`)
  })

  it('opens Telegram in a new tab, the call in place', () => {
    const [call, telegram] = supportLinks({ call: 'Call', write: 'Write on Telegram' })
    expect(call).toMatchObject({ label: 'Call', href: SUPPORT_LINE.phoneHref, caption: SUPPORT_LINE.phone })
    expect(call!.external).toBeUndefined()
    expect(telegram).toMatchObject({ label: 'Write on Telegram', href: SUPPORT_LINE.telegramHref, external: true })
  })
})
