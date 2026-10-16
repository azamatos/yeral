/**
 * SMS goes through this port (ADR 0005): the log adapter outside production; the gateway comes with M8
 * (open question: provider and sender name).
 */
import type { Logger } from './log'

export interface SmsMessage {
  to: string
  text: string
}

export interface SmsPort {
  send(message: SmsMessage): Promise<void>
}

/** Writes messages to the log and keeps them in memory (tests read `sent`). */
export function logSms(log: Logger): SmsPort & { sent: SmsMessage[] } {
  const sent: SmsMessage[] = []
  return {
    sent,
    send(message) {
      sent.push(message)
      log.info('sms', { to: message.to, text: message.text })
      return Promise.resolve()
    },
  }
}
