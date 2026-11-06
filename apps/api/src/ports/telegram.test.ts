import { siteConfig } from '@yeral/lib/site'
import { describe, expect, it } from 'vitest'
import { sameSecret } from '../lib/crypto'
import { registerWebhook } from '../modules/telegram/register'
import { blockedBot, memoryTelegram, telegramBot, TelegramError } from './telegram'

const TOKEN = '123456:AAHfakeTokenForTheTests0123456789abc'
const SECRET = 'webhook-secret-for-the-tests-0123'

/** A Bot API that answers as told and keeps every request. */
function fakeApi(answer: (method: string) => { status: number; body: unknown }) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const fetcher = ((input: string | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, body: JSON.parse(init?.body as string) as Record<string, unknown> })
    expect(init?.method).toBe('POST')
    const { status, body } = answer(url.slice(url.lastIndexOf('/') + 1))
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  }) as typeof fetch
  return { calls, fetcher }
}

describe('the Bot API over fetch (ADR 0029)', () => {
  it('sends a message with its keyboard, the token in the address only', async () => {
    const api = fakeApi(() => ({ status: 200, body: { ok: true, result: { message_id: 1 } } }))
    const bot = telegramBot(TOKEN, 'yeral_app_bot', api.fetcher)
    await bot.sendMessage(42, 'hello', { remove_keyboard: true })
    expect(api.calls).toEqual([
      {
        url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        body: { chat_id: 42, text: 'hello', reply_markup: { remove_keyboard: true } },
      },
    ])
    expect(bot.username).toBe('yeral_app_bot')
  })

  it('a refusal is an error with Telegram’s status and words, never the token; 403 is a person who blocked the bot', async () => {
    const api = fakeApi(() => ({
      status: 403,
      body: { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' },
    }))
    const bot = telegramBot(TOKEN, 'yeral_app_bot', api.fetcher)
    const error = await bot.sendMessage(42, 'hello').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TelegramError)
    expect(error).toMatchObject({ method: 'sendMessage', status: 403, description: 'Forbidden: bot was blocked by the user' })
    expect(String((error as Error).message)).not.toContain(TOKEN)
    expect(blockedBot(error)).toBe(true)
    const down = telegramBot(TOKEN, 'yeral_app_bot', () => Promise.reject(new Error('ECONNRESET')))
    const failed = await down.sendMessage(42, 'hello').catch((e: unknown) => e)
    expect(failed).toMatchObject({ status: 0, description: 'ECONNRESET' })
    expect(blockedBot(failed)).toBe(false)
  })

  it('telegram-webhook registers the api’s address with the secret, messages only, and reports without secrets', async () => {
    const api = fakeApi(() => ({ status: 200, body: { ok: true, result: true, description: 'Webhook was set' } }))
    const bot = telegramBot(TOKEN, 'yeral_app_bot', api.fetcher)
    const site = siteConfig({ env: 'production', domain: 'yeral.example' })
    const said = await registerWebhook(bot, site, SECRET)
    expect(api.calls).toEqual([
      {
        url: `https://api.telegram.org/bot${TOKEN}/setWebhook`,
        body: {
          url: 'https://api.yeral.example/v1/telegram/webhook',
          secret_token: SECRET,
          allowed_updates: ['message'],
          drop_pending_updates: false,
        },
      },
    ])
    expect(said).toBe('webhook set: https://api.yeral.example/v1/telegram/webhook (@yeral_app_bot): Webhook was set')
    expect(said).not.toContain(SECRET)
    expect(said).not.toContain(TOKEN)
    // the memory bot keeps the request for the api's tests
    const memory = memoryTelegram()
    await registerWebhook(memory, site, SECRET)
    expect(memory.webhooks).toEqual([{ url: 'https://api.yeral.example/v1/telegram/webhook', secret: SECRET }])
  })
})

describe('sameSecret (the webhook’s header)', () => {
  it('equal strings only, whatever their length', () => {
    expect(sameSecret(SECRET, SECRET)).toBe(true)
    expect(sameSecret(SECRET, `${SECRET}4`)).toBe(false)
    expect(sameSecret(SECRET, SECRET.slice(0, -1))).toBe(false)
    expect(sameSecret(SECRET, SECRET.replace('0', '1'))).toBe(false)
    expect(sameSecret('', SECRET)).toBe(false)
    expect(sameSecret('', '')).toBe(true)
  })
})
