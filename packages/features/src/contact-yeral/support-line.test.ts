import { describe, expect, it } from 'vitest'
import { supportLine, supportLinks } from './support-line'

const all = { phone: '+99312345678', telegram: 'yeral_support', email: 'hello@yeral.app' }
const words = { call: 'Call', write: 'Write on Telegram', email: 'Write an e-mail' }

describe('the support line', () => {
  it('is written as the market writes numbers and linked to call, to Telegram and to mail', () => {
    expect(supportLine(all)).toEqual({
      phone: '+993 12 34 56 78',
      phoneHref: 'tel:+99312345678',
      telegram: '@yeral_support',
      telegramHref: 'https://t.me/yeral_support',
      email: 'hello@yeral.app',
      emailHref: 'mailto:hello@yeral.app',
    })
  })

  it('leaves out a way that is not set', () => {
    expect(supportLine({ phone: '+99312345678' })).toEqual({ phone: '+993 12 34 56 78', phoneHref: 'tel:+99312345678' })
    expect(supportLine({})).toEqual({})
    // another country's number isn't rewritten as the market's
    expect(supportLine({ phone: '+79123456789' }).phone).toBe('+79123456789')
  })

  it('links the ways that are set in the drawn order; Telegram in a new tab, the call and the mail in place', () => {
    const [call, telegram, email] = supportLinks(all, words)
    expect(call).toMatchObject({ label: 'Call', href: 'tel:+99312345678', caption: '+993 12 34 56 78' })
    expect(call!.external).toBeUndefined()
    expect(telegram).toMatchObject({
      label: 'Write on Telegram',
      href: 'https://t.me/yeral_support',
      caption: '@yeral_support',
      external: true,
    })
    expect(email).toMatchObject({ label: 'Write an e-mail', href: 'mailto:hello@yeral.app', caption: 'hello@yeral.app' })
    expect(email!.external).toBeUndefined()
    expect(supportLinks({ email: all.email }, words).map((l) => l.id)).toEqual(['email'])
    expect(supportLinks({}, words)).toEqual([])
  })
})
