import { useEffect, useRef, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { Callout } from '../callout'
import { CodeInput } from '../code-input'
import { Field, FieldMessage } from '../field'
import { PhoneInput } from '../phone-input'
import { Spinner } from '../spinner'

/** Every word the step shows. The first-release copy is the default design; with `sms` the screen passes the SMS words. */
export type SignInCodeStepCopy = {
  /** «Phone number» */
  phoneLabel: string
  /** A sample number in the market's grouping: «65 12 34 56». */
  phonePlaceholder?: string
  /** «Send code» */
  sendCode: string
  /** «Sending…» — in the button and read out. */
  sending: string
  /** «Code» («SMS code» with `sms`) */
  codeLabel: string
  /** «It checks itself after the 4th digit.» */
  codeHint: string
  /** «Your code:» — before the code shown on screen. */
  yourCode: string
  /** «Confirm» */
  confirm: string
  /** «Checking…» — in Confirm and read out. */
  checking: string
  /** «Get a new code» */
  resend: string
  /** «Get a new code in 0:59» — `time` is m:ss. */
  resendIn: (time: string) => string
  /** «The old code no longer works.» — when the lock is over. */
  codeExpired: string
  /** «Here’s a new code.» («New code sent.» with `sms`) */
  resent: string
}

/** The market's phone rules, as PhoneInput takes them (`COUNTRY_PREFIX`, `MARKET.phone.length`, `formatNational`). */
export type SignInPhoneRules = { prefix: string; maxDigits: number; format: (digits: string) => string }

export type SignInCodeStepProps = Omit<ComponentProps<'form'>, 'onSubmit' | 'children'> & {
  step: 'phone' | 'code'
  copy: SignInCodeStepCopy
  phoneRules: SignInPhoneRules
  /** Boxes 48 (client modal, booking step; M buttons) or 56 (business login; L buttons); 52 on phones either way. */
  size?: 48 | 56
  /** The market sends codes by SMS: no code on screen. Market config, never per person; off at the first release. */
  sms?: boolean
  /**
   * 5 codes for one number in an hour: «Too many codes. Try again in 42 minutes.» On the phone step it replaces Send
   * code; on the code step the boxes are disabled and the code, Confirm and resend are hidden.
   */
  tooManyCodes?: ReactNode

  // phone step
  /** The national digits typed so far. */
  phone?: string
  onPhoneChange?: (digits: string) => void
  /** The SMS link page: the booking's number, masked on the server («65 •• •• 22»), read-only. */
  maskedPhone?: string
  /** Under the number: «If you already book on Ýeral as a client, use that number…» */
  phoneHint?: ReactNode
  /** The screen's validation, in this order: «The number is incomplete…», then «Codes go to mobile numbers only…». */
  phoneError?: ReactNode
  /** The code is on its way: spinner + «Sending…» in the button, the number can't change. */
  sending?: boolean
  /** Send code (or Enter) — the screen validates the number and asks for a code. */
  onSendCode?: () => void
  /** A line under Send code (the terms). */
  sendNote?: ReactNode

  // code step
  /** The digits typed so far. */
  code?: string
  onCodeChange?: (code: string) => void
  /** The 4th digit or Confirm with 4 digits: check the code. Confirm with fewer digits focuses the first empty box. */
  onSubmitCode?: (code: string) => void
  /** First release: the code shown on screen («4821»); hidden with `sms` and while locked or rate-limited. */
  shownCode?: string
  /** The code is being checked: boxes read-only, «Checking…» in Confirm, resend waits. */
  checking?: boolean
  /** «Wrong code. 2 tries left.» — the boxes turn red and the digits are selected for retyping. */
  codeError?: ReactNode
  /** After 3 wrong codes: «Too many tries. Try again in 60 seconds.» (the screen counts down). Boxes disabled; the code, Confirm and resend hidden. */
  locked?: ReactNode
  /** The lock is over and the old code no longer works: the only action is «Get a new code». */
  codeExpired?: boolean
  /** Seconds until a new code can be asked for: «Get a new code in 0:42»; 0 → «Get a new code». */
  resendIn?: number
  /** A new code replaced the old one: «Here’s a new code.» under the boxes. */
  resent?: boolean
  /** Get a new code (the resend link, or the button after the lock). */
  onResend?: () => void
}

const CODE_LENGTH = 4

/** Seconds as m:ss — «0:59», «1:05». */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Sign-in step (DS-Patterns → 05 Inputs → «Sign-in · SignInCodeStep»): the phone step and the code step, the same in
 * the client login modal, the booking flows, the business login and (later) the SMS link page. Controlled and
 * presentational: the screen owns the requests, the clock and the rules (validation, tries, lock, the 5-codes-an-hour
 * limit) and passes their state and messages; the step draws the field, the code on screen, the buttons, the resend
 * countdown, every message, and moves focus. The container gives the title and the lead («To log in with … Change
 * number»). Copy comes from props.
 */
export function SignInCodeStep({
  step,
  copy,
  phoneRules,
  size = 48,
  sms = false,
  tooManyCodes,
  phone = '',
  onPhoneChange,
  maskedPhone,
  phoneHint,
  phoneError,
  sending = false,
  onSendCode,
  sendNote,
  code = '',
  onCodeChange,
  onSubmitCode,
  shownCode,
  checking = false,
  codeError,
  locked,
  codeExpired = false,
  resendIn = 0,
  resent = false,
  onResend,
  className,
  ...props
}: SignInCodeStepProps) {
  const phoneRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const newCodeRef = useRef<HTMLButtonElement>(null)
  const buttonSize = size === 56 ? 'l' : 'm'
  const limited = Boolean(tooManyCodes)
  const blocked = limited || Boolean(locked) || codeExpired
  const wrong = Boolean(codeError) && !blocked
  const hasPhoneError = Boolean(phoneError)

  // the code step starts in the first box
  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])
  // a wrong code: back in the boxes with the digits selected, so typing replaces them
  useEffect(() => {
    if (step === 'code' && wrong && !checking) {
      codeRef.current?.focus()
      codeRef.current?.select()
    }
  }, [step, wrong, checking])
  // a new code: back to the first box
  useEffect(() => {
    if (step === 'code' && resent) codeRef.current?.focus()
  }, [step, resent, shownCode])
  // the lock is over: the only way on is a new code
  useEffect(() => {
    if (step === 'code' && codeExpired && !limited) newCodeRef.current?.focus()
  }, [step, codeExpired, limited])
  // a wrong number: back in the field
  useEffect(() => {
    if (step === 'phone' && hasPhoneError) phoneRef.current?.focus()
  }, [step, hasPhoneError])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (step === 'phone') {
      if (!sending && !limited) onSendCode?.()
      return
    }
    if (checking || blocked) return
    if (code.length < CODE_LENGTH) codeRef.current?.focus()
    else onSubmitCode?.(code)
  }

  // read out what the buttons and hints say while it happens (errors speak for themselves as alerts)
  const spoken =
    step === 'phone'
      ? sending
        ? copy.sending
        : ''
      : checking
        ? copy.checking
        : codeExpired && !limited
          ? copy.codeExpired
          : resent && !blocked && !wrong
            ? copy.resent
            : ''

  return (
    <form noValidate {...props} onSubmit={submit} className={cn('flex flex-col gap-6', className)}>
      {step === 'phone' ? (
        <>
          <Field label={copy.phoneLabel} error={phoneError} hint={phoneHint}>
            {maskedPhone !== undefined ? (
              <PhoneInput masked={maskedPhone} prefix={phoneRules.prefix} />
            ) : (
              <PhoneInput
                ref={phoneRef}
                value={phone}
                onValueChange={(digits) => onPhoneChange?.(digits)}
                {...phoneRules}
                placeholder={copy.phonePlaceholder}
                readOnly={sending}
              />
            )}
          </Field>
          <div className="flex flex-col gap-3">
            {limited ? (
              <FieldMessage>{tooManyCodes}</FieldMessage>
            ) : (
              <SubmitButton size={buttonSize} busy={sending} busyLabel={copy.sending}>
                {copy.sendCode}
              </SubmitButton>
            )}
            {sendNote}
          </div>
        </>
      ) : (
        <>
          {!sms && shownCode && !blocked && (
            <Callout size="s" live className="items-center text-body">
              {copy.yourCode} <b className="ml-1 text-[17px] leading-[22px] font-semibold tracking-[0.08em] tabular-nums">{shownCode}</b>
            </Callout>
          )}
          <Field
            label={copy.codeLabel}
            // tooManyCodes and the lock are about the step, not a wrong entry: a red message, grey boxes
            message={tooManyCodes ?? locked ?? (wrong ? codeError : undefined)}
            hint={
              blocked
                ? codeExpired && !limited
                  ? copy.codeExpired
                  : undefined
                : checking || wrong
                  ? undefined
                  : resent
                    ? copy.resent
                    : copy.codeHint
            }
            className="gap-2"
          >
            <CodeInput
              ref={codeRef}
              value={code}
              onValueChange={(next) => onCodeChange?.(next)}
              onComplete={(full) => {
                if (!checking && !blocked) onSubmitCode?.(full)
              }}
              length={CODE_LENGTH}
              size={size}
              responsive
              invalid={wrong}
              disabled={blocked}
              readOnly={checking}
              aria-busy={checking || undefined}
            />
          </Field>
          {codeExpired && !limited ? (
            <Button ref={newCodeRef} variant="primary" size={buttonSize} className="w-full" onClick={onResend}>
              {copy.resend}
            </Button>
          ) : (
            !blocked && (
              <div className="flex flex-col gap-3">
                <SubmitButton size={buttonSize} busy={checking} busyLabel={copy.checking}>
                  {copy.confirm}
                </SubmitButton>
                <button
                  type="button"
                  disabled={resendIn > 0 || checking}
                  onClick={onResend}
                  className={cn(
                    'hit inline-flex min-h-8 cursor-pointer items-center gap-1.5 self-start rounded-xs text-small font-semibold whitespace-nowrap text-a-600',
                    'hover:text-a-700 hover:underline focus-visible:shadow-focus focus-visible:outline-none',
                    'disabled:cursor-default disabled:text-n-500 disabled:tabular-nums disabled:no-underline',
                  )}
                >
                  {resendIn > 0 ? copy.resendIn(formatCountdown(resendIn)) : copy.resend}
                </button>
              </div>
            )
          )}
        </>
      )}
      <span role="status" className="sr-only">
        {spoken}
      </span>
    </form>
  )
}

/** The step's primary: full width; while busy a spinner + the busy words, same width, clicks ignored. */
function SubmitButton({ size, busy, busyLabel, children }: { size: 'm' | 'l'; busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <Button
      type="submit"
      variant="primary"
      size={size}
      className={cn('w-full', busy && 'cursor-progress active:translate-y-0')}
      aria-disabled={busy || undefined}
      onClick={(e) => {
        if (busy) e.preventDefault()
      }}
    >
      {busy ? (
        <>
          <Spinner />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
