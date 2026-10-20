/**
 * SMS goes through this port (ADR 0005): the log adapter in every environment until a gateway comes with the
 * Turkmenistan launch (book chapter 8, Q-036; sender "Yeral", Q-109).
 */
import type { Logger } from './log'

export interface SmsMessage {
  to: string
  text: string
  /** The text holds a sign-in code: anyone who reads it could sign in, so no log ever shows it. */
  secret?: boolean
}

export interface SmsPort {
  send(message: SmsMessage): Promise<void>
}

/** A booking link's token opens the booking (book Q-168): logs show the path, not the token. */
export const hideLinkTokens = (text: string) => text.replace(/\/l\/[\w-]+/g, '/l/…')

/** Writes messages to the log, sign-in codes and link tokens hidden, and keeps nothing, so a long-running process doesn't grow. */
export function logSms(log: Logger): SmsPort {
  return {
    send(message) {
      log.info('sms', { to: message.to, text: message.secret ? '(sign-in code hidden)' : hideLinkTokens(message.text) })
      return Promise.resolve()
    },
  }
}

/** Keeps messages in memory for the tests (`sent`). */
export function memorySms(): SmsPort & { sent: SmsMessage[] } {
  const sent: SmsMessage[] = []
  return {
    sent,
    send(message) {
      sent.push(message)
      return Promise.resolve()
    },
  }
}
