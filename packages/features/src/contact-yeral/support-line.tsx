import { formatPhone } from '@yeral/domain/phone'
import type { Support } from '@yeral/lib/site'
import type { MenuLink } from '@yeral/ui/menu'
import { Mail, Phone, Send } from 'lucide-react'

/** The ways to reach Ýeral (`site.support`) as the screens write and link them; a way that isn't set is undefined. */
export interface SupportLine {
  /** `+993 12 34 56 78`, as the market writes numbers. */
  phone?: string
  phoneHref?: string
  /** `@name`. */
  telegram?: string
  telegramHref?: string
  email?: string
  emailHref?: string
}

export function supportLine({ phone, telegram, email }: Support): SupportLine {
  return {
    ...(phone && { phone: formatPhone(phone), phoneHref: `tel:${phone}` }),
    ...(telegram && { telegram: `@${telegram}`, telegramHref: `https://t.me/${telegram}` }),
    ...(email && { email, emailHref: `mailto:${email}` }),
  }
}

/**
 * Contact Ýeral's links (B-Shell ContactMenu), the ways that are set in the drawn order: call the number, write on
 * Telegram in a new tab, write an e-mail (the Telegram row's pattern). None set: no links, and no Contact Ýeral.
 */
export function supportLinks(support: Support, words: { call: string; write: string; email: string }): MenuLink[] {
  const line = supportLine(support)
  const links: MenuLink[] = []
  if (line.phone && line.phoneHref)
    links.push({ id: 'call', label: words.call, caption: line.phone, icon: <Phone />, href: line.phoneHref })
  if (line.telegram && line.telegramHref)
    links.push({ id: 'telegram', label: words.write, caption: line.telegram, icon: <Send />, href: line.telegramHref, external: true })
  if (line.email && line.emailHref)
    links.push({ id: 'email', label: words.email, caption: line.email, icon: <Mail />, href: line.emailHref })
  return links
}
