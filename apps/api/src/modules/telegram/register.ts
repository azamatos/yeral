/**
 * `telegram-webhook` (the api CLI, ADR 0029): tells Telegram where the bot's updates go, the api's own address, with
 * the secret the webhook checks, and messages only. Run once after the bot is set up, and again when the api's address
 * or the secret changes. Says what Telegram answered; never the token or the secret.
 */
import type { SiteConfig } from '@yeral/lib/site'
import type { TelegramPort } from '../../ports/telegram'

export const WEBHOOK_PATH = '/v1/telegram/webhook'

export const webhookUrl = (site: SiteConfig): string => `${site.urls.api}${WEBHOOK_PATH}`

export async function registerWebhook(bot: TelegramPort, site: SiteConfig, secret: string): Promise<string> {
  const url = webhookUrl(site)
  const answer = await bot.setWebhook({ url, secret })
  return `${answer.ok ? 'webhook set' : 'webhook refused'}: ${url} (@${bot.username})${answer.description ? `: ${answer.description}` : ''}`
}
