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

/**
 * The digits a mobile number starts with, for «Enter a number starting with 6 or 7.»: read from the market's rule when
 * it is a plain first-digit class (`/^[67]/`); null for any other shape, and the message goes without them.
 */
export function mobileStarts(rule: RegExp = MARKET.phone.mobile): string[] | null {
  const m = /^\^\[(\d+)\]$/.exec(rule.source)
  return m?.[1] ? [...m[1]] : null
}
