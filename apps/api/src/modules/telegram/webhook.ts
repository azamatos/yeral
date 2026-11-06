/**
 * What the bot does with an update (ADR 0029): `/start <nonce>` from the sign-in's link opens a link request and asks
 * for the person's number with the "Share my number" button; the contact that comes back, the sender's own and the
 * number the request was asked for, makes the link and brings the waiting code. Anything else gets a word about what the
 * bot is for. Every reply is in the request's language, else the person's Telegram language when the market has it.
 */
import { MARKET } from '@yeral/domain/market'
import type { Locale } from '@yeral/domain/model'
import { isPhone, maskPhone, toE164 } from '@yeral/domain/phone'
import { createT } from '@yeral/i18n/fmt'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { telegramLinkRequests } from '../../db/schema'
import type { Deps } from '../../deps'
import { codeSmsText } from '../../notify'
import type { ReplyMarkup, TelegramPort } from '../../ports/telegram'
import { reissueWaitingCode } from '../auth/codes'
import { chatRequest, firstSeen, link, openRequest } from './links'

/** The parts of a Telegram update the bot reads; the rest is dropped. */
export const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      from: z.object({ id: z.number().int(), language_code: z.string().optional() }).optional(),
      chat: z.object({ id: z.number().int(), type: z.string() }),
      text: z.string().optional(),
      contact: z.object({ phone_number: z.string(), user_id: z.number().int().optional() }).optional(),
    })
    .optional(),
})
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>

type BotDeps = Pick<Deps, 'db' | 'now' | 'site' | 'log'> & { telegram: TelegramPort }

/** The market's language the person's Telegram is in, else the market's main one. */
const langOf = (code: string | undefined): Locale => {
  const short = code?.slice(0, 2).toLowerCase()
  return MARKET.languages.find((l) => l === short) ?? MARKET.defaultLanguage
}

const START = /^\/start(?:@\w+)?(?:\s+([\w-]{1,64}))?\s*$/

export async function handleUpdate(deps: BotDeps, update: TelegramUpdate): Promise<void> {
  if (!(await firstSeen(deps.db, update.update_id))) return
  const message = update.message
  // only a person's own chat: the bot has nothing to say in a group
  if (!message?.from || message.chat.type !== 'private') return
  const chatId = message.chat.id
  const t = createT(langOf(message.from.language_code))
  const brand = t('common.brand')
  const say = (text: string, replyMarkup?: ReplyMarkup) => deps.telegram.sendMessage(chatId, text, replyMarkup)

  if (message.contact) {
    const request = await chatRequest(deps.db, chatId, deps.now())
    if (!request) return say(t('telegram.noRequest'))
    const tr = createT(request.lang)
    const { contact } = message
    const own = contact.user_id === message.from.id && isPhone(contact.phone_number) && toE164(contact.phone_number) === request.phone
    if (!own) return say(tr('telegram.wrongNumber', { phone: maskPhone(request.phone) }))
    const code = await deps.db.transaction(async (tx) => {
      await link(tx, { phone: request.phone, chatId, telegramUserId: message.from!.id })
      await tx
        .update(telegramLinkRequests)
        .set({ usedAt: new Date(deps.now()) })
        .where(eq(telegramLinkRequests.tokenHash, request.tokenHash))
      return reissueWaitingCode({ ...deps, db: tx }, { phone: request.phone, purpose: request.purpose })
    })
    deps.log.info('telegram linked', { to: request.phone })
    const done = tr('telegram.linked', { brand: tr('common.brand') })
    return say(code ? `${done}\n\n${codeSmsText(request.lang, code)}` : `${done}\n\n${tr('telegram.askAgain')}`, { remove_keyboard: true })
  }

  const start = message.text?.match(START)
  const nonce = start?.[1]
  if (!nonce) return say(t('telegram.welcome', { brand }))
  const request = await openRequest(deps.db, nonce, chatId, deps.now())
  if (!request) return say(t('telegram.expired'))
  const tr = createT(request.lang)
  if (request.chatId !== chatId)
    await deps.db.update(telegramLinkRequests).set({ chatId }).where(eq(telegramLinkRequests.tokenHash, request.tokenHash))
  return say(tr('telegram.shareNumber', { brand: tr('common.brand') }), {
    keyboard: [[{ text: tr('telegram.shareButton'), request_contact: true }]],
    one_time_keyboard: true,
    resize_keyboard: true,
  })
}
