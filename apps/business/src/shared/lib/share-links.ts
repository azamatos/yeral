/**
 * The page's share links (B-Settings Link and QR's Share menu: WhatsApp · Telegram; IMO has no share address, so it
 * waits for the phone's own share sheet).
 */
export function shareLinks(url: string) {
  const link = encodeURIComponent(url)
  return { whatsapp: `https://wa.me/?text=${link}`, telegram: `https://t.me/share/url?url=${link}` }
}
