/**
 * SMS goes through this port (ADR 0005): the log adapter in every environment until a gateway comes with the
 * Turkmenistan launch (book chapter 8, Q-036; sender "Yeral", Q-109).
 */
import { isUnusedNumber } from '@yeral/domain/phone'
import type { Logger } from './log'

export interface SmsMessage {
  to: string
  text: string
  /** The text holds a sign-in code: anyone who reads it could sign in, so no log ever shows it. */
  secret?: boolean
}

export interface SmsPort {
  send(message: SmsMessage): Promise<void>
  /** Whether a message reaches the phone: a sign-in code is shown on the screen only while none does (`codeOnScreen`). */
  readonly delivers: boolean
}

/**
 * A booking link's token opens the booking (book Q-168): logs and stored errors show the path, not the token, also
 * when a gateway echoes the text JSON-escaped (`\/l\/…`) or URL-encoded (`%2Fl%2F…`).
 */
export const hideLinkTokens = (text: string) => text.replace(/(\/|\\\/|%2F)l(\/|\\\/|%2F)[\w-]+/gi, '$1l$2…')

/**
 * Every adapter sends nothing to the market's unused range: the demo workspace's numbers, nobody's (book F-242), the
 * Ýeral team's notices to its owner included.
 */
const goesNowhere = (message: SmsMessage) => isUnusedNumber(message.to)

/** Writes messages to the log, sign-in codes and link tokens hidden, and keeps nothing, so a long-running process doesn't grow. */
export function logSms(log: Logger): SmsPort {
  return {
    delivers: false,
    send(message) {
      if (goesNowhere(message)) return Promise.resolve()
      log.info('sms', { to: message.to, text: message.secret ? '(sign-in code hidden)' : hideLinkTokens(message.text) })
      return Promise.resolve()
    },
  }
}

/** Keeps messages in memory for the tests (`sent`); `delivers` plays a gateway. */
export function memorySms({ delivers = false } = {}): SmsPort & { sent: SmsMessage[] } {
  const sent: SmsMessage[] = []
  return {
    sent,
    delivers,
    send(message) {
      if (!goesNowhere(message)) sent.push(message)
      return Promise.resolve()
    },
  }
}
