import { MARKET } from '@yeral/domain/market'
import { formatPhone } from '@yeral/domain/phone'
import type { MenuLink } from '@yeral/ui/menu'
import { Phone, Send } from 'lucide-react'

/** The market's support line (`MARKET.support`) as the screens write and link it. */
export const SUPPORT_LINE = {
  phone: formatPhone(MARKET.support.phone),
  phoneHref: `tel:${MARKET.support.phone}`,
  telegram: `@${MARKET.support.telegram}`,
  telegramHref: `https://t.me/${MARKET.support.telegram}`,
} as const

/** Contact Ýeral's two links (B-Shell): call the number, or write on Telegram in a new tab. */
export function supportLinks(words: { call: string; write: string }): MenuLink[] {
  return [
    { id: 'call', label: words.call, caption: SUPPORT_LINE.phone, icon: <Phone />, href: SUPPORT_LINE.phoneHref },
    {
      id: 'telegram',
      label: words.write,
      caption: SUPPORT_LINE.telegram,
      icon: <Send />,
      href: SUPPORT_LINE.telegramHref,
      external: true,
    },
  ]
}
