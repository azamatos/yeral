/**
 * SMS goes through this port (ADR 0005): the log adapter in every environment until a gateway comes with the
 * Turkmenistan launch (book chapter 8, Q-036; sender "Yeral", Q-109).
 */
import type { Logger } from './log'

export interface SmsMessage {
  to: string
  text: string
}

export interface SmsPort {
  send(message: SmsMessage): Promise<void>
}

/** Writes messages to the log and keeps nothing, so a long-running process doesn't grow. */
export function logSms(log: Logger): SmsPort {
  return {
    send(message) {
      log.info('sms', { to: message.to, text: message.text })
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
