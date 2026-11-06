/** The dependencies as the Node entry builds them (`deps.ts`), from the environment. */
import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'
import type { Db } from './db/client'
import { createDeps } from './deps'
import { nullLogger } from './ports/log'

const base = { DATABASE_URL: 'postgres://yeral@localhost:5432/yeral' }
const bot = {
  ...base,
  TELEGRAM_BOT_TOKEN: '123456:AAHfakeTokenForTheTests0123456789abc',
  TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-the-tests-0123',
  TELEGRAM_BOT_USERNAME: 'yeral_app_bot',
}
// nothing touches the database while the dependencies are built
const db = {} as Db

describe('the Telegram bot in the dependencies (ADR 0029)', () => {
  it('with the token, codes reach phones: the SMS port delivers, and the code on the screen is refused', () => {
    const deps = createDeps(loadConfig(bot), db, nullLogger)
    expect(deps.telegram).toMatchObject({ bot: { username: 'yeral_app_bot' }, webhookSecret: 'webhook-secret-for-the-tests-0123' })
    expect(deps.sms.delivers).toBe(true)
    expect(() => createDeps(loadConfig({ ...bot, SIGN_IN_CODE_ON_SCREEN: 'true' }), db, nullLogger)).toThrow(
      /SIGN_IN_CODE_ON_SCREEN=true.*TELEGRAM_BOT_TOKEN/,
    )
  })

  it('without it, everything as before: the log, and the code on the screen when the first launch says so', () => {
    const deps = createDeps(loadConfig({ ...base, SIGN_IN_CODE_ON_SCREEN: 'true' }), db, nullLogger)
    expect(deps.telegram).toBeNull()
    expect(deps.sms.delivers).toBe(false)
    expect(deps.codeOnScreen).toBe(true)
  })
})
