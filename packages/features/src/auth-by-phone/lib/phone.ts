/** The market's phone rules as the sign-in needs them (ADR 0023: nothing here names a country). */
import { MARKET } from '@yeral/domain/market'
import { COUNTRY_PREFIX, formatNational, isMobile } from '@yeral/domain/phone'
import type { SignInPhoneRules } from '@yeral/ui/sign-in-code-step'

export const PHONE_RULES: SignInPhoneRules = { prefix: COUNTRY_PREFIX, maxDigits: MARKET.phone.length, format: formatNational }

/** Before asking for a code: a short number first, then a landline (design C1, same order in every sign-in). */
export function phoneProblem(digits: string): 'incomplete' | 'notMobile' | undefined {
  if (digits.length !== MARKET.phone.length) return 'incomplete'
  if (!isMobile(digits)) return 'notMobile'
  return undefined
}
