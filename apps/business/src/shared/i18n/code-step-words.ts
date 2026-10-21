import { MARKET } from '@yeral/domain/market'
import type { SignInState, signInView } from '@yeral/features/auth-by-phone'
import type { SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { useFormatter, useTranslations } from 'use-intl'

/**
 * What the shared SignInCodeStep says in this app, from the code steps' state (`useCodeSteps`): the login's words, a
 * wrong number, the wrong code, the lock and the rate limit. The login and My profile's "Change number" both use it;
 * each adds its own label and Cancel.
 */
export function useCodeStepWords({ state, view }: { state: SignInState; view: ReturnType<typeof signInView> }) {
  const t = useTranslations('login')
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
  const phoneError =
    state.phoneError === 'incomplete'
      ? t('incomplete', { digits: MARKET.phone.length })
      : state.phoneError === 'notMobile'
        ? t('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
        : undefined
  return {
    copy,
    phoneError,
    tooManyCodes: view.tooManyCodesMin ? t('tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined,
    codeError: state.attemptsLeft !== undefined ? t('wrongCode', { left: state.attemptsLeft }) : undefined,
    locked: view.locked ? t('locked', { seconds: view.lockLeftSec }) : undefined,
  }
}
