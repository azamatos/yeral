/**
 * The bot's webhook (ADR 0029): Telegram posts every update here with the secret the `telegram-webhook` command
 * registered. Always 200 once the secret matches: Telegram sends an update again until it's answered, and one it can't
 * deliver holds every later one back, so what the bot can't use is logged and let go. Without a bot, the route doesn't
 * exist (404).
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AppEnv } from '../../http/env'
import { errorBody } from '../../http/errors'
import { errors, json } from '../../http/openapi'
import { sameSecret } from '../../lib/crypto'
import { handleUpdate, telegramUpdateSchema } from './webhook'

export const SECRET_HEADER = 'X-Telegram-Bot-Api-Secret-Token'

const webhookRoute = createRoute({
  method: 'post',
  path: '/telegram/webhook',
  // Telegram's, not the apps': kept out of the public OpenAPI document (`/openapi.json`)
  hide: true,
  tags: ['telegram'],
  summary: 'The Telegram bot’s webhook (ADR 0029): the sign-in’s link and the shared number make the link, the code follows',
  responses: { 200: json(z.object({ ok: z.literal(true) })), 401: errors[401], 404: errors[404] },
})

export const telegramRoutes = new OpenAPIHono<AppEnv>().openapi(webhookRoute, async (c) => {
  const { deps } = c.var
  if (!deps.telegram) return c.json(errorBody('not_found'), 404)
  if (!sameSecret(c.req.header(SECRET_HEADER) ?? '', deps.telegram.webhookSecret)) return c.json(errorBody('unauthorized'), 401)
  const parsed = telegramUpdateSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    deps.log.warn('telegram update not understood', { issues: parsed.error.issues.length })
    return c.json({ ok: true as const }, 200)
  }
  try {
    await handleUpdate({ ...deps, telegram: deps.telegram.bot }, parsed.data)
  } catch (e) {
    deps.log.error('telegram update failed', {
      updateId: parsed.data.update_id,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e),
    })
  }
  return c.json({ ok: true as const }, 200)
})
