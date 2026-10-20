import { describe, expect, it } from 'vitest'
import type { Logger } from './log'
import { hideLinkTokens, logSms } from './sms'

describe('logSms', () => {
  const capture = () => {
    const lines: Record<string, unknown>[] = []
    const write = (_msg: string, data?: Record<string, unknown>) => void lines.push(data ?? {})
    const log: Logger = { debug: write, info: write, warn: write, error: write }
    return { log, lines }
  }

  it('writes booking texts to the log', async () => {
    const { log, lines } = capture()
    await logSms(log).send({ to: '+99365000001', text: 'Ýeral: Glow Studio confirmed your booking.' })
    expect(lines).toEqual([{ to: '+99365000001', text: 'Ýeral: Glow Studio confirmed your booking.' }])
  })

  it('never writes a sign-in code to the log', async () => {
    const { log, lines } = capture()
    await logSms(log).send({ to: '+99365000001', text: 'Ýeral code: 4821', secret: true })
    expect(JSON.stringify(lines)).not.toContain('4821')
  })

  it('never writes a booking link’s token to the log (book Q-168)', async () => {
    const { log, lines } = capture()
    await logSms(log).send({
      to: '+99365000001',
      text: 'Ýeral: Glow Studio confirmed your booking. Change: yeral.app/l/Abc_123-xyzXYZ0987654',
    })
    expect(JSON.stringify(lines)).not.toContain('Abc_123')
    expect(JSON.stringify(lines)).toContain('yeral.app/l/…')
  })

  it('hides tokens a gateway echoes escaped or encoded', () => {
    expect(hideLinkTokens('yeral.app\\/l\\/Abc_123-xyz')).toBe('yeral.app\\/l\\/…')
    expect(hideLinkTokens('yeral.app%2Fl%2FAbc_123-xyz')).toBe('yeral.app%2Fl%2F…')
  })
})
