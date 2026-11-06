import { MARKET } from '@yeral/domain/market'
import { maskPhone, toE164 } from '@yeral/domain/phone'
import type { SignInState, signInView } from '@yeral/features/auth-by-phone'
import type { SignInCodeStepCopy, TelegramStepCopy } from '@yeral/ui/sign-in-code-step'
import { useFormatter, useTranslations } from 'use-intl'

/**
 * What the shared SignInCodeStep says in this app, from the code steps' state (`useCodeSteps`): the login's words, the
 * Telegram step's words (DS-Lists B10), a wrong number, the wrong code, the lock and the rate limit. The login and My
 * profile's "Change number" both use it; each adds its own label and Cancel.
 */
export function useCodeStepWords({ state, view }: { state: SignInState; view: ReturnType<typeof signInView> }) {
  const t = useTranslations('login')
  const tg = useTranslations('login.telegram')
  const brand = useTranslations('common')('brand')
  const format = useFormatter()
  const copy: SignInCodeStepCopy = {
    phoneLabel: t('phoneLabel'),
    sendCode: t('sendCode'),
    sending: t('sending'),
    codeLabel: t('codeLabel'),
    codeHint: t('codeHint'),
    yourCode: t('yourCode'),
    confirm: t('confirm'),
    checking: t('checking'),
    resend: t('resend'),
    resendIn: (time) => t('resendIn', { time }),
    codeExpired: t('codeExpired'),
    resent: t('resent'),
  }
  // the number the code went to: a number still being typed isn't one yet
  const masked = state.sentTo ? maskPhone(toE164(state.sentTo), 'last') : ''
  const telegram: TelegramStepCopy = {
    codeLabel: tg('codeLabel'),
    checking: t('checking'),
    resend: t('resend'),
    resendIn: (time) => t('resendIn', { time }),
    codeExpired: tg('codeExpired'),
    openTelegram: tg('openTelegram'),
    noTelegram: tg('noTelegram'),
    noTelegramHelp: tg.rich('noTelegramHelp', { phone: masked, b: (chunks) => <b className="whitespace-nowrap">{chunks}</b> }),
    stillStuck: tg('stillStuck', { brand }),
    call: tg('call'),
    writeTelegram: tg('write'),
    linkAgain: tg('linkAgain'),
    linkSteps: [tg('linkStep1'), tg('linkStep2'), tg('linkStep3')],
    sendFailed: tg('sendFailed'),
    signedIn: tg('signedIn'),
  }
  const phoneError =
    state.phoneError === 'incomplete'
      ? t('incomplete', { digits: MARKET.phone.length })
      : state.phoneError === 'notMobile'
        ? t('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
        : undefined
  return {
    copy,
    telegram,
    phoneError,
    tooManyCodes: view.tooManyCodesMin ? t('tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined,
    codeError: state.attemptsLeft !== undefined ? t('wrongCode', { left: state.attemptsLeft }) : undefined,
    locked: view.locked ? t('locked', { seconds: view.lockLeftSec }) : undefined,
  }
}
