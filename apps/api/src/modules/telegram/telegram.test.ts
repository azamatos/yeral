import { maskPhone } from '@yeral/domain/phone'
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, TELEGRAM_SECRET, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { loginCodes, rateLimits, telegramLinkRequests, telegramLinks, telegramUpdates } from '../../db/schema'
import { seed } from '../../db/seed'
import { blockedBot, telegramBot, TelegramError } from '../../ports/telegram'
import { pruneTelegram } from './links'

type App = ReturnType<typeof testApp>

/** What Telegram posts to the webhook: `/start`, with the link's nonce or without, and a shared contact. */
let updateId = 1
const from = (chat: number, language_code = 'en') => ({ from: { id: chat, language_code }, chat: { id: chat, type: 'private' } })
const start = (chat: number, nonce?: string, language_code?: string) => ({
  update_id: updateId++,
  message: { message_id: 1, ...from(chat, language_code), text: nonce ? `/start ${nonce}` : '/start' },
})
/** `user_id`: whose contact it is (the sender's by default); null, a contact that isn't a Telegram user. */
const contact = (chat: number, phone_number: string, user_id: number | null = chat) => ({
  update_id: updateId++,
  message: { message_id: 2, ...from(chat), contact: { phone_number, first_name: 'Merdan', ...(user_id === null ? {} : { user_id }) } },
})
const nonceOf = (link: string) => new URL(link).searchParams.get('start') ?? ''

const webhook = (t: App, update: unknown, secret: string | null = TELEGRAM_SECRET) =>
  t.app.request('/v1/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(secret === null ? {} : { 'X-Telegram-Bot-Api-Secret-Token': secret }) },
    body: JSON.stringify(update),
  })

describe('sign-in codes through our Telegram bot (ADR 0029)', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    for (const table of [rateLimits, loginCodes, telegramLinks, telegramLinkRequests, telegramUpdates]) await db.delete(table)
  })

  /** A sign-in from an unlinked number, through `/start` and the shared contact, to the link. */
  async function linkUp(t: App, phone: string, chat: number) {
    const sent = await browser(t.app).req('/v1/auth/code', { body: { phone } })
    expect(sent.json.delivery).toBe('telegram_link')
    expect((await webhook(t, start(chat, nonceOf(sent.json.link)))).status).toBe(200)
    expect((await webhook(t, contact(chat, phone))).status).toBe(200)
    return sent
  }

  it('an unlinked number gets the link; the chat that opens it and shares that number gets the code, and the next code straight away', async () => {
    const phone = '+99365000041'
    const t = testApp(db, { telegram: true })
    const b = browser(t.app)
    const sent = await b.req('/v1/auth/code', { body: { phone } })
    expect(sent.status).toBe(200)
    expect(sent.json).toEqual({
      resendAfterSec: 59,
      expiresInSec: 300,
      delivery: 'telegram_link',
      link: expect.stringMatching(/^https:\/\/t\.me\/yeral_test_bot\?start=[\w-]{32}$/),
    })
    // the code waits: it went nowhere, not even the log's fallback
    expect(t.sms.sent).toEqual([])
    expect(t.telegram!.sent).toEqual([])
    // the link opened in Telegram: the bot asks for the number with the button
    expect((await webhook(t, start(1001, nonceOf(sent.json.link)))).status).toBe(200)
    expect(t.telegram!.sent.at(-1)).toEqual({
      chatId: 1001,
      text: 'To get your Ýeral codes here, share the number you typed on the site.',
      replyMarkup: { keyboard: [[{ text: 'Share my number', request_contact: true }]], one_time_keyboard: true, resize_keyboard: true },
    })
    // the contact, the number as Telegram gives it (no +): linked, the keyboard goes, the code comes
    await webhook(t, contact(1001, '99365000041'))
    expect(t.telegram!.sent.at(-1)).toEqual({
      chatId: 1001,
      text: 'Done: your Ýeral codes come here from now on.\n\nÝeral code: 1234',
      replyMarkup: { remove_keyboard: true },
    })
    expect(await db.select().from(telegramLinks)).toEqual([expect.objectContaining({ phone, chatId: 1001, telegramUserId: 1001 })])
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '1234' } })).status).toBe(200)
    // linked: the next code goes to the chat at once, logged as every SMS is
    t.clock.now += 60_000
    expect((await b.req('/v1/auth/code', { body: { phone } })).json).toEqual({
      resendAfterSec: 59,
      expiresInSec: 300,
      delivery: 'telegram',
      // «Open Telegram» opens the chat the code came to
      link: 'https://t.me/yeral_test_bot',
    })
    expect(t.telegram!.sent.at(-1)).toEqual({ chatId: 1001, text: 'Ýeral code: 1234' })
    expect(t.sms.sent).toEqual([])
    // the code's limits go on: nobody floods a linked chat by typing its number
    const sentCount = t.telegram!.sent.length
    const tooSoon = await b.req('/v1/auth/code', { body: { phone } })
    expect(tooSoon.status).toBe(429)
    expect(tooSoon.json.error).toMatchObject({ code: 'resend_too_soon' })
    expect(t.telegram!.sent).toHaveLength(sentCount)
  })

  it('production’s random code: the one sent on linking is a fresh one (only hashes are kept), and it signs in', async () => {
    const phone = '+99365000042'
    const t = testApp(db, { telegram: true, demo: false })
    await linkUp(t, phone, 1002)
    const code = /code: (\d{4})$/.exec(t.telegram!.sent.at(-1)!.text)?.[1] ?? ''
    expect(code).toMatch(/^\d{4}$/)
    expect((await browser(t.app).req('/v1/auth/verify', { body: { phone, code } })).status).toBe(200)
  })

  it('/auth/mode says telegram ahead; the webhook wants the secret; without a bot the route doesn’t exist', async () => {
    const t = testApp(db, { telegram: true })
    expect((await browser(t.app).req('/v1/auth/mode')).json).toEqual({ codeOnScreen: false, delivery: 'telegram' })
    expect((await webhook(t, start(1003), 'wrong')).status).toBe(401)
    expect((await webhook(t, start(1003), null)).status).toBe(401)
    expect(t.telegram!.sent).toEqual([])
    expect((await webhook(testApp(db), start(1003))).status).toBe(404)
  })

  it('/start without a nonce says what the bot is for, in the market’s language; an unknown, expired or spent nonce is refused', async () => {
    const t = testApp(db, { telegram: true })
    const bot = t.telegram!
    await webhook(t, start(1004, undefined, 'ru'))
    expect(bot.sent.at(-1)).toEqual({ chatId: 1004, text: expect.stringMatching(/^This is the Ýeral bot: /) })
    await webhook(t, start(1004, 'no-such-nonce'))
    expect(bot.sent.at(-1)).toEqual({ chatId: 1004, text: 'This link has expired. Ask for a new code on the site.' })
    // expired: ten minutes
    const sent = await browser(t.app).req('/v1/auth/code', { body: { phone: '+99365000043' } })
    t.clock.now += 601_000
    await webhook(t, start(1004, nonceOf(sent.json.link)))
    expect(bot.sent.at(-1)).toMatchObject({ chatId: 1004, text: expect.stringMatching(/expired/) })
    // spent: once the link is made
    const spent = await linkUp(t, '+99365000044', 1005)
    await webhook(t, start(1005, nonceOf(spent.json.link)))
    expect(bot.sent.at(-1)).toMatchObject({ chatId: 1005, text: expect.stringMatching(/expired/) })
    // opened from one chat, another chat can't take it over
    const other = await browser(t.app).req('/v1/auth/code', { body: { phone: '+99365000045' } })
    await webhook(t, start(1006, nonceOf(other.json.link)))
    await webhook(t, start(1007, nonceOf(other.json.link)))
    expect(bot.sent.at(-1)).toMatchObject({ chatId: 1007, text: expect.stringMatching(/expired/) })
    expect(await db.select().from(telegramLinks)).toHaveLength(1)
  })

  it('the contact must be the sender’s own and the number the code was asked for', async () => {
    const phone = '+99365000046'
    const t = testApp(db, { telegram: true })
    const bot = t.telegram!
    // no request from this chat: told where to start
    await webhook(t, contact(1010, phone))
    expect(bot.sent.at(-1)).toEqual({ chatId: 1010, text: 'Ask for a code on the site first, then open the link it shows.' })
    const sent = await browser(t.app).req('/v1/auth/code', { body: { phone } })
    await webhook(t, start(1010, nonceOf(sent.json.link)))
    const wrong = `That's not the number you typed on the site (${maskPhone(phone)}). Share your own number, with the button, from the Telegram account that has it.`
    // someone else's contact with the right number; a contact that isn't a Telegram user; another number; a foreign one
    for (const c of [contact(1010, phone, 1011), contact(1010, phone, null), contact(1010, '+99365000047'), contact(1010, '+15550100')]) {
      await webhook(t, c)
      expect(bot.sent.at(-1)).toEqual({ chatId: 1010, text: wrong })
    }
    expect(await db.select().from(telegramLinks)).toEqual([])
    expect(t.sms.sent).toEqual([])
    // the right one still works: the request is open until it's used
    await webhook(t, contact(1010, phone))
    expect(bot.sent.at(-1)).toMatchObject({ chatId: 1010, text: expect.stringContaining('Ýeral code: 1234') })
    expect(await db.select().from(telegramLinks)).toEqual([expect.objectContaining({ phone, chatId: 1010 })])
  })

  it('a repeated update does nothing twice; what the bot can’t read is let go with a 200', async () => {
    const t = testApp(db, { telegram: true })
    const update = start(1012)
    await webhook(t, update)
    await webhook(t, update)
    expect(t.telegram!.sent).toHaveLength(1)
    expect((await webhook(t, { not: 'an update' })).status).toBe(200)
    expect(
      (
        await webhook(t, {
          update_id: updateId++,
          message: { message_id: 3, ...from(1012), text: '/start x', chat: { id: -5, type: 'group' } },
        })
      ).status,
    ).toBe(200)
    expect(t.telegram!.sent).toHaveLength(1)
  })

  it('a person who blocked the bot loses the link: the next sign-in asks them to link again', async () => {
    const phone = '+99365000048'
    const t = testApp(db, { telegram: true })
    await linkUp(t, phone, 1013)
    t.telegram!.blocked.add(1013)
    t.clock.now += 60_000
    const again = await browser(t.app).req('/v1/auth/code', { body: { phone } })
    expect(again.json).toMatchObject({ delivery: 'telegram_link' })
    expect(await db.select().from(telegramLinks)).toEqual([])
  })

  it('«Link again»: a linked number asks for a new link (a lost Telegram account, a recycled number), proved by the contact as the first time', async () => {
    const phone = '+99365000051'
    const t = testApp(db, { telegram: true })
    const b = browser(t.app)
    const first = await linkUp(t, phone, 1017)
    t.clock.now += 60_000
    // the stored link stays until a chat proves the number; the code went nowhere yet
    const sentCount = t.telegram!.sent.length
    const again = await b.req('/v1/auth/code', { body: { phone, relink: true } })
    expect(again.status).toBe(200)
    expect(again.json).toMatchObject({ delivery: 'telegram_link', link: expect.stringMatching(/\?start=[\w-]{32}$/) })
    expect(nonceOf(again.json.link)).not.toBe(nonceOf(first.json.link))
    expect(t.telegram!.sent).toHaveLength(sentCount)
    expect(await db.select({ chatId: telegramLinks.chatId }).from(telegramLinks)).toEqual([{ chatId: 1017 }])
    // the same limits: no second link within the resend time
    expect((await b.req('/v1/auth/code', { body: { phone, relink: true } })).json.error).toMatchObject({ code: 'resend_too_soon' })
    // the new chat shares the number: it holds the link now, and gets the code
    expect((await webhook(t, start(1018, nonceOf(again.json.link)))).status).toBe(200)
    expect((await webhook(t, contact(1018, phone))).status).toBe(200)
    expect(await db.select({ chatId: telegramLinks.chatId }).from(telegramLinks)).toEqual([{ chatId: 1018 }])
    expect(t.telegram!.sent.at(-1)).toMatchObject({ chatId: 1018, text: expect.stringContaining('1234') })
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '1234' } })).status).toBe(200)
  })

  it('a phone change takes «Link again» too: the new number’s old chat is someone else’s by now, a new one proves it', async () => {
    const newPhone = '+99365000053'
    const t = testApp(db, { telegram: true })
    await linkUp(t, newPhone, 1020)
    t.clock.now += 60_000
    const b = browser(t.app)
    await b.login('+99365222030')
    const linked = await b.req('/v1/me/phone/code', { body: { phone: newPhone } })
    expect(linked.json).toMatchObject({ delivery: 'telegram', link: 'https://t.me/yeral_test_bot' })
    expect(t.telegram!.sent.at(-1)).toMatchObject({ chatId: 1020 })
    t.clock.now += 60_000
    const again = await b.req('/v1/me/phone/code', { body: { phone: newPhone, relink: true } })
    expect(again.status).toBe(200)
    expect(again.json).toMatchObject({ delivery: 'telegram_link', link: expect.stringMatching(/\?start=[\w-]{32}$/) })
    expect((await webhook(t, start(1021, nonceOf(again.json.link)))).status).toBe(200)
    expect((await webhook(t, contact(1021, newPhone))).status).toBe(200)
    expect(await db.select({ chatId: telegramLinks.chatId }).from(telegramLinks).where(eq(telegramLinks.phone, newPhone))).toEqual([
      { chatId: 1021 },
    ])
    expect(t.telegram!.sent.at(-1)).toMatchObject({ chatId: 1021, text: expect.stringContaining('1234') })
    expect((await b.req('/v1/me/phone/verify', { body: { phone: newPhone, code: '1234' } })).status).toBe(200)
  })

  it('Telegram out (an error other than a blocked bot): the code request says telegram_unavailable, and the next try isn’t told to wait', async () => {
    const phone = '+99365000052'
    const t = testApp(db, { telegram: true })
    const b = browser(t.app)
    await linkUp(t, phone, 1019)
    t.clock.now += 60_000
    t.telegram!.down = new TelegramError('sendMessage', 502, 'Bad Gateway')
    const failed = await b.req('/v1/auth/code', { body: { phone } })
    expect(failed.status).toBe(503)
    expect(failed.json.error).toMatchObject({ code: 'telegram_unavailable' })
    // the link stays: it's Telegram that's out, not the person gone
    expect(await db.select({ chatId: telegramLinks.chatId }).from(telegramLinks)).toEqual([{ chatId: 1019 }])
    t.telegram!.down = null
    const retried = await b.req('/v1/auth/code', { body: { phone } })
    expect(retried.json).toMatchObject({ delivery: 'telegram' })
    expect(t.telegram!.sent.at(-1)).toEqual({ chatId: 1019, text: 'Ýeral code: 1234' })
  })

  it('a Telegram error names the method and Telegram’s words, never the token in the Bot API’s address', async () => {
    const token = '123456:SECRET-TOKEN'
    const answers = [
      new Response(JSON.stringify({ ok: false, description: 'Bad Gateway' }), { status: 502 }),
      Promise.reject(new TypeError(`fetch failed: https://api.telegram.org/bot${token}/sendMessage`)),
    ]
    const bot = telegramBot(token, 'yeral_test_bot', () => Promise.resolve(answers.shift()!))
    for (const expected of [{ status: 502, description: 'Bad Gateway' }, { status: 0 }]) {
      const error = await bot.sendMessage(1, 'x').catch((e: unknown) => e)
      expect(error).toBeInstanceOf(TelegramError)
      expect(error).toMatchObject({ method: 'sendMessage', ...expected })
      expect((error as Error).message).not.toContain(token)
      expect(blockedBot(error)).toBe(false)
    }
  })

  it('a chat holds one number: a new contact from it replaces the old link', async () => {
    const t = testApp(db, { telegram: true })
    await linkUp(t, '+99365000049', 1014)
    t.clock.now += 60_000
    await linkUp(t, '+99365000050', 1014)
    expect(await db.select({ phone: telegramLinks.phone, chatId: telegramLinks.chatId }).from(telegramLinks)).toEqual([
      { phone: '+99365000050', chatId: 1014 },
    ])
  })

  it('every other text on the SMS port reaches a linked phone through the bot, an unlinked one the log; the unused range’s numbers nothing', async () => {
    const t = testApp(db, { telegram: true })
    await linkUp(t, '+99365000051', 1015)
    expect(t.deps.sms.delivers).toBe(true)
    await t.deps.sms.send({ to: '+99365000051', text: 'Ýeral: Glow Studio confirmed your booking. Change: https://yeral.test/l/abc' })
    expect(t.telegram!.sent.at(-1)).toEqual({
      chatId: 1015,
      text: 'Ýeral: Glow Studio confirmed your booking. Change: https://yeral.test/l/abc',
    })
    expect(t.sms.sent).toEqual([])
    await t.deps.sms.send({ to: '+99365000052', text: 'to the log' })
    expect(t.sms.sent).toEqual([{ to: '+99365000052', text: 'to the log' }])
    // blocked meanwhile: the fallback, and the link goes
    t.telegram!.blocked.add(1015)
    await t.deps.sms.send({ to: '+99365000051', text: 'blocked' })
    expect(t.sms.sent.at(-1)).toEqual({ to: '+99365000051', text: 'blocked' })
    expect(await db.select().from(telegramLinks)).toEqual([])
  })

  it('the jobs prune link requests that ran out and updates seen a day ago', async () => {
    const t = testApp(db, { telegram: true })
    await browser(t.app).req('/v1/auth/code', { body: { phone: '+99365000053' } })
    await webhook(t, start(1016))
    await pruneTelegram(db, t.clock.now + 60_000)
    expect(await db.select().from(telegramLinkRequests)).toHaveLength(1)
    expect(await db.select().from(telegramUpdates)).toHaveLength(1)
    await pruneTelegram(db, t.clock.now + 601_000)
    expect(await db.select().from(telegramLinkRequests)).toHaveLength(0)
    await db.update(telegramUpdates).set({ seenAt: new Date(t.clock.now - 86_401_000) })
    await pruneTelegram(db, t.clock.now)
    expect(await db.select().from(telegramUpdates)).toHaveLength(0)
  })
})
