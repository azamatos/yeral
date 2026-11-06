/**
 * Our Telegram bot (ADR 0029): sign-in codes, and every other text the SMS port carries, reach the phones linked to a
 * chat through it until an SMS gateway comes. Plain `fetch` to the Bot API (https://core.telegram.org/bots/api), no SDK:
 * the three methods below are all we call. The links themselves live in `modules/telegram`.
 */

/** A keyboard under the message: the "Share my number" button (`request_contact`), or taking a keyboard away. */
export type ReplyMarkup =
  { keyboard: { text: string; request_contact: true }[][]; one_time_keyboard: true; resize_keyboard: true } | { remove_keyboard: true }

export interface TelegramPort {
  /** The bot's username without `@`: the sign-in's link opens `https://t.me/<username>?start=<nonce>`. */
  readonly username: string
  /** `sendMessage`; throws `TelegramError`, whose `status` is 403 when the person blocked the bot. */
  sendMessage(chatId: number, text: string, replyMarkup?: ReplyMarkup): Promise<void>
  /** `setWebhook` (the `telegram-webhook` command): where updates go and the secret they carry. */
  setWebhook(req: { url: string; secret: string }): Promise<{ ok: boolean; description?: string }>
}

/** The Bot API said no: `status` as HTTP has it, `description` as Telegram words it. */
export class TelegramError extends Error {
  constructor(
    readonly method: string,
    readonly status: number,
    readonly description: string,
  ) {
    super(`Telegram ${method}: ${status} ${description}`)
  }
}

/** Whether the chat can't be written to any more: the person blocked the bot, or deleted their account. */
export const blockedBot = (e: unknown): boolean => e instanceof TelegramError && e.status === 403

interface ApiAnswer {
  ok: boolean
  description?: string
  result?: unknown
}

/** The Bot API over `fetch`; every call waits 10 seconds at most. The token is in the URL, so no error ever repeats it. */
export function telegramBot(token: string, username: string, fetcher: typeof fetch = fetch): TelegramPort {
  const call = async (method: string, params: Record<string, unknown>): Promise<ApiAnswer> => {
    let res: Response
    try {
      res = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (e) {
      // a network error may word the address it failed on, token and all
      throw new TelegramError(method, 0, (e instanceof Error ? e.message : String(e)).split(token).join('<token>'))
    }
    const answer = (await res.json().catch(() => ({ ok: false, description: 'not JSON' }))) as ApiAnswer
    if (!res.ok || !answer.ok)
      throw new TelegramError(method, answer.ok ? res.status : (res.status ?? 0), answer.description ?? res.statusText)
    return answer
  }
  return {
    username,
    async sendMessage(chatId, text, replyMarkup) {
      await call('sendMessage', { chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) })
    },
    async setWebhook({ url, secret }) {
      const answer = await call('setWebhook', { url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: false })
      return { ok: answer.ok, ...(answer.description ? { description: answer.description } : {}) }
    },
  }
}

export interface SentTelegram {
  chatId: number
  text: string
  replyMarkup?: ReplyMarkup
}

/**
 * Keeps messages in memory for the tests (`sent`); a chat in `blocked` answers 403 as a person who blocked the bot does;
 * `down` is the error every send fails with while Telegram is out.
 */
export function memoryTelegram(username = 'yeral_test_bot'): TelegramPort & {
  sent: SentTelegram[]
  blocked: Set<number>
  down: TelegramError | null
  webhooks: { url: string; secret: string }[]
} {
  const sent: SentTelegram[] = []
  const blocked = new Set<number>()
  const webhooks: { url: string; secret: string }[] = []
  const port = {
    username,
    sent,
    blocked,
    down: null as TelegramError | null,
    webhooks,
    sendMessage(chatId: number, text: string, replyMarkup?: ReplyMarkup) {
      if (port.down) return Promise.reject(port.down)
      if (blocked.has(chatId)) return Promise.reject(new TelegramError('sendMessage', 403, 'Forbidden: bot was blocked by the user'))
      sent.push({ chatId, text, ...(replyMarkup ? { replyMarkup } : {}) })
      return Promise.resolve()
    },
    setWebhook(req: { url: string; secret: string }) {
      webhooks.push(req)
      return Promise.resolve({ ok: true, description: 'Webhook was set' })
    },
  }
  return port
}
