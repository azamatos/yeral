import { describe, expect, it } from 'vitest'
import { shareLinks } from './share-links'

describe('shareLinks', () => {
  it('shares the full address to WhatsApp and Telegram', () => {
    const links = shareLinks('https://yeral.app/b/glow-studio')
    expect(links.whatsapp).toBe('https://wa.me/?text=https%3A%2F%2Fyeral.app%2Fb%2Fglow-studio')
    expect(links.telegram).toBe('https://t.me/share/url?url=https%3A%2F%2Fyeral.app%2Fb%2Fglow-studio')
  })
})
