import { MARKET, telegramUrl } from '@yeral/domain/market'
import { formatPhone } from '@yeral/domain/phone'

/** Ýeral's support line in this market (book F-174): Contact Ýeral's call and Telegram, written and linked. */
export const support = {
  phone: formatPhone(MARKET.support.phone),
  phoneHref: `tel:${MARKET.support.phone}`,
  telegram: `@${MARKET.support.telegram}`,
  telegramHref: telegramUrl(MARKET.support.telegram),
}
