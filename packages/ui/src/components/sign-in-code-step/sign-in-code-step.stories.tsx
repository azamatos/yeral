/**
 * Sign-in step — DS-Patterns → 05 Inputs → «Sign-in · SignInCodeStep» (the phone step and the code step, every state),
 * in context on B-Login (business, boxes 56) and the client login modal / booking step (boxes 48); 52 on phones.
 * The first-release copy (the code on screen) is the default; `Sms` is the later variant. The frame stands in for the
 * container (AuthCard, Modal S), which gives the title and the lead. Copy is the board's English, passed as props.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MARKET } from '@yeral/domain/market'
import { COUNTRY_PREFIX, formatNational, isMobile } from '@yeral/domain/phone'
import { useEffect, useState, type ReactNode } from 'react'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { SignInCodeStep, type SignInCodeStepCopy, type SignInCodeStepProps } from './sign-in-code-step'

const TM = { prefix: COUNTRY_PREFIX, maxDigits: MARKET.phone.length, format: formatNational }

const EN: SignInCodeStepCopy = {
  phoneLabel: 'Phone number',
  phonePlaceholder: '65 12 34 56',
  sendCode: 'Send code',
  sending: 'Sending…',
  codeLabel: 'Code',
  codeHint: 'It checks itself after the 4th digit.',
  yourCode: 'Your code:',
  confirm: 'Confirm',
  checking: 'Checking…',
  resend: 'Get a new code',
  resendIn: (time) => `Get a new code in ${time}`,
  codeExpired: 'The old code no longer works.',
  resent: 'Here’s a new code.',
}

const SMS: SignInCodeStepCopy = { ...EN, codeLabel: 'SMS code', resent: 'New code sent.' }

const RU: SignInCodeStepCopy = {
  phoneLabel: 'Номер телефона',
  phonePlaceholder: '65 12 34 56',
  sendCode: 'Получить код',
  sending: 'Отправляем…',
  codeLabel: 'Код',
  codeHint: 'Код проверится сам после 4-й цифры.',
  yourCode: 'Ваш код:',
  confirm: 'Подтвердить',
  checking: 'Проверяем…',
  resend: 'Получить новый код',
  resendIn: (time) => `Получить новый код через ${time}`,
  codeExpired: 'Старый код больше не действует.',
  resent: 'Вот новый код.',
}

const INCOMPLETE = 'The number is incomplete — it needs 8 digits.'
const NOT_MOBILE = 'Codes go to mobile numbers only. Enter a number starting with 6 or 7.'
const TOO_MANY_CODES = 'Too many codes. Try again in 42 minutes.'
const BUSINESS_HINT = 'If you already book on Ýeral as a client, use that number — one account works for both.'

/** Stands in for the container (AuthCard 56 / Modal S 48): title and lead; the card loses its frame on phones. */
function Frame({ step, size, children }: { step: 'phone' | 'code'; size?: 48 | 56; children: ReactNode }) {
  return (
    <div
      className={
        size === 56
          ? 'flex max-w-110 flex-col gap-6 rounded-card border border-n-200 p-8 max-sm:border-0 max-sm:p-0'
          : 'flex max-w-100 flex-col gap-6 rounded-card border border-n-200 p-7 max-sm:border-0 max-sm:p-0'
      }
    >
      <div className="flex flex-col gap-2">
        <h2 id="sign-in-title" className="text-h3 font-bold">
          {step === 'phone' ? 'Log in to Ýeral Business' : 'Enter the code'}
        </h2>
        <p className="text-body text-n-600">
          {step === 'phone' ? (
            'Enter your phone number — we’ll show you a 4-digit code. No password needed.'
          ) : (
            <>
              To log in with <b className="font-semibold whitespace-nowrap text-n-900">+993 65 10 20 30</b>.{' '}
              <button type="button" className="cursor-pointer font-semibold whitespace-nowrap text-a-600 hover:underline">
                Change number
              </button>
            </>
          )}
        </p>
      </div>
      {children}
    </div>
  )
}

/** The screen's part for one fixed state: it keeps what's typed; the state itself comes from the story's args. */
function Controlled(props: SignInCodeStepProps) {
  const [phone, setPhone] = useState(props.phone ?? '')
  const [code, setCode] = useState(props.code ?? '')
  return (
    <Frame step={props.step} size={props.size}>
      <SignInCodeStep
        aria-labelledby="sign-in-title"
        {...props}
        phone={phone}
        onPhoneChange={(digits) => {
          setPhone(digits)
          props.onPhoneChange?.(digits)
        }}
        code={code}
        onCodeChange={(next) => {
          setCode(next)
          props.onCodeChange?.(next)
        }}
      />
    </Frame>
  )
}

const meta = {
  title: 'Inputs/SignInCodeStep',
  component: SignInCodeStep,
  args: {
    step: 'code',
    copy: EN,
    phoneRules: TM,
    size: 48,
    shownCode: '4821',
    resendIn: 59,
    onSendCode: fn(),
    onSubmitCode: fn(),
    onResend: fn(),
  },
  argTypes: { copy: { control: false }, phoneRules: { control: false } },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof SignInCodeStep>
export default meta
type Story = StoryObj<typeof meta>

const codeBox = (canvas: { getByLabelText: (label: string) => HTMLElement }, label = 'Code') =>
  canvas.getByLabelText(label) as HTMLInputElement

// ---------------------------------------------------------------- phone step

export const PhoneEmpty: Story = {
  name: 'Phone · Empty',
  args: { step: 'phone', size: 56, phoneHint: BUSINESS_HINT },
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText('Phone number')
    await expect(input).toHaveAccessibleDescription(BUSINESS_HINT)
    await userEvent.type(input, '65102030')
    await expect(input).toHaveValue('65 10 20 30')
    await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
    await expect(args.onSendCode).toHaveBeenCalledOnce()
  },
}

export const PhoneSending: Story = {
  name: 'Phone · Sending',
  args: { step: 'phone', size: 56, phone: '65102030', sending: true },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Sending…' })
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(button)
    await expect(args.onSendCode).not.toHaveBeenCalled()
    await expect(canvas.getByLabelText('Phone number')).toHaveAttribute('readonly')
    await expect(canvas.getByRole('status')).toHaveTextContent('Sending…')
  },
}

export const PhoneIncomplete: Story = {
  name: 'Phone · Incomplete',
  args: { step: 'phone', size: 56, phone: '65102', phoneError: INCOMPLETE, phoneHint: BUSINESS_HINT },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Phone number')
    await expect(canvas.getByRole('alert')).toHaveTextContent(INCOMPLETE)
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveFocus()
  },
}

export const PhoneNotMobile: Story = {
  name: 'Phone · Not a mobile number',
  args: { step: 'phone', size: 56, phone: '12456789', phoneError: NOT_MOBILE },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(NOT_MOBILE)
  },
}

export const PhoneTooManyCodes: Story = {
  name: 'Phone · Too many codes',
  args: { step: 'phone', size: 56, phone: '65102030', tooManyCodes: TOO_MANY_CODES },
  play: async ({ args, canvas }) => {
    // the wait ticks (minutes): no alert role, the live region says it once
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
    await expect(canvas.getByRole('status')).toHaveTextContent(TOO_MANY_CODES)
    await expect(canvas.queryByRole('button', { name: 'Send code' })).not.toBeInTheDocument()
    await userEvent.type(canvas.getByLabelText('Phone number'), '{Enter}')
    await expect(args.onSendCode).not.toHaveBeenCalled()
  },
}

/** The SMS link page (later, with SMS): the booking's number, masked and read-only; only «Send code». */
export const PhoneMasked: Story = {
  name: 'Phone · Masked (SMS link page)',
  args: { step: 'phone', maskedPhone: '65 •• •• 22', phoneHint: 'The code goes only to the number on the booking.' },
  play: async ({ args, canvas }) => {
    const number = canvas.getByRole('textbox', { name: 'Phone number' })
    await expect(number).toHaveAttribute('aria-readonly', 'true')
    await expect(number).toHaveTextContent('65 •• •• 22')
    await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
    await expect(args.onSendCode).toHaveBeenCalledOnce()
  },
}

// ---------------------------------------------------------------- code step

/** The code is shown on screen (first release); the resend link counts down from 0:59. */
export const CodeEmpty: Story = {
  name: 'Code · Empty (resend countdown)',
  play: async ({ args, canvas }) => {
    const input = codeBox(canvas)
    await expect(input).toHaveFocus()
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    await expect(input).toHaveAttribute('inputmode', 'numeric')
    await expect(canvas.getByText('4821').closest('[role="status"]')).toHaveTextContent('Your code: 4821')
    await expect(canvas.getByRole('button', { name: 'Get a new code in 0:59' })).toBeDisabled()
    // Confirm with fewer digits goes back to the first empty box instead of checking
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm' }))
    await expect(args.onSubmitCode).not.toHaveBeenCalled()
    await expect(input).toHaveFocus()
  },
}

/** Auto-check on the 4th digit; Confirm stays visible for paste, slow typing and screen readers. */
export const CodeTyping: Story = {
  name: 'Code · Typing',
  args: { code: '482', resendIn: 42 },
  play: async ({ args, canvas }) => {
    await userEvent.type(codeBox(canvas), '1')
    await expect(args.onSubmitCode).toHaveBeenCalledWith('4821')
    // Enter (or Confirm) before the screen says it's checking doesn't send the same code twice
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmitCode).toHaveBeenCalledOnce()
  },
}

export const CodePaste: Story = {
  name: 'Code · Paste fills all boxes',
  play: async ({ args, canvas }) => {
    const input = codeBox(canvas)
    await userEvent.click(input)
    await userEvent.paste('48 21')
    await expect(input).toHaveValue('4821')
    await expect(args.onSubmitCode).toHaveBeenCalledWith('4821')
  },
}

export const CodeChecking: Story = {
  name: 'Code · Checking',
  args: { code: '4821', checking: true, resendIn: 38 },
  play: async ({ args, canvas }) => {
    const input = codeBox(canvas)
    await expect(input).toHaveAttribute('readonly')
    await expect(input).toHaveAttribute('aria-busy', 'true')
    const confirm = canvas.getByRole('button', { name: 'Checking…' })
    await expect(confirm).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(confirm)
    await expect(args.onSubmitCode).not.toHaveBeenCalled()
    await expect(canvas.getByRole('button', { name: 'Get a new code in 0:38' })).toBeDisabled()
  },
}

/** Boxes red, «N tries left», the digits selected: typing replaces them. */
export const CodeWrong: Story = {
  name: 'Code · Wrong code',
  args: { code: '4827', codeError: 'Wrong code. 2 tries left.', resendIn: 31 },
  play: async ({ args, canvas }) => {
    const input = codeBox(canvas)
    await expect(canvas.getByRole('alert')).toHaveTextContent('Wrong code. 2 tries left.')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(input).toHaveFocus())
    await expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4])
    await userEvent.keyboard('4821')
    await expect(args.onSubmitCode).toHaveBeenCalledWith('4821')
  },
}

/** After 3 wrong codes: boxes disabled; the code, Confirm and resend hidden while the message counts down. */
export const CodeLocked: Story = {
  name: 'Code · Locked',
  args: { locked: 'Too many tries. Try again in 60 seconds.' },
  play: async ({ canvas }) => {
    // the lock counts down every second: no alert role, the live region says it once
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
    await expect(codeBox(canvas)).toHaveAccessibleDescription('Too many tries. Try again in 60 seconds.')
    await expect(canvas.getByRole('status')).toHaveTextContent('Too many tries. Try again in 60 seconds.')
    await expect(codeBox(canvas)).toBeDisabled()
    await expect(canvas.queryByText('4821')).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /Get a new code/ })).not.toBeInTheDocument()
  },
}

/** The lock is over: the old code no longer works; the only action is a new code. */
export const CodeLockOver: Story = {
  name: 'Code · Lock over',
  args: { codeExpired: true },
  play: async ({ args, canvas }) => {
    const newCode = canvas.getByRole('button', { name: 'Get a new code' })
    await waitFor(() => expect(newCode).toHaveFocus())
    await expect(codeBox(canvas)).toHaveAccessibleDescription('The old code no longer works.')
    await expect(canvas.getByRole('status')).toHaveTextContent('The old code no longer works.')
    await expect(canvas.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    await userEvent.click(newCode)
    await expect(args.onResend).toHaveBeenCalledOnce()
  },
}

export const CodeResendReady: Story = {
  name: 'Code · Resend ready',
  args: { code: '4', resendIn: 0 },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Get a new code' }))
    await expect(args.onResend).toHaveBeenCalledOnce()
  },
}

/** A new code replaces the old one in the callout; the timer restarts. */
export const CodeResent: Story = {
  name: 'Code · Resent (new code)',
  args: { shownCode: '7305', resent: true, resendIn: 59 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('7305')).toBeVisible()
    await expect(codeBox(canvas)).toHaveAccessibleDescription('Here’s a new code.')
    await expect(codeBox(canvas)).toHaveFocus()
  },
}

/** 5 codes for one number in an hour: boxes disabled; the code, Confirm and resend hidden. */
export const CodeTooManyCodes: Story = {
  name: 'Code · Too many codes',
  args: { tooManyCodes: TOO_MANY_CODES },
  play: async ({ canvas }) => {
    await expect(codeBox(canvas)).toHaveAccessibleDescription(TOO_MANY_CODES)
    await expect(canvas.getByRole('status')).toHaveTextContent(TOO_MANY_CODES)
    await expect(codeBox(canvas)).toBeDisabled()
    await expect(canvas.queryByText('4821')).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  },
}

/** Later, the day SMS is live in a market: no code on screen, «SMS code», «New code sent.». */
export const Sms: Story = {
  args: { sms: true, copy: SMS },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('SMS code')).toBeInTheDocument()
    await expect(canvas.queryByText('4821')).not.toBeInTheDocument()
  },
}

// ---------------------------------------------------------------- sizes

export const Size48: Story = { name: 'Size 48 · client modal, booking step' }

export const Size56: Story = { name: 'Size 56 · business login', args: { size: 56 } }

/** Under 768 the boxes are 52 whatever the size; the card loses its frame. */
export const Size52: Story = {
  name: 'Size 52 · on a phone',
  args: { size: 56 },
  globals: { viewport: { value: 'xs' } },
}

export const LongText: Story = {
  name: 'Long text (Russian)',
  args: { copy: RU, code: '4827', codeError: 'Неверный код. Осталось 2 попытки.', resendIn: 31 },
}

// ---------------------------------------------------------------- the whole flow

const CODES = ['4821', '7305', '1946', '5582', '3067']

/**
 * How a screen drives the step (B-Login's rules; the real ones run on the api): validation order, sending, the code on
 * screen, 3 wrong codes → 60 s lock → a new code, 5 codes an hour. Any code but the shown one is wrong.
 */
function Flow({ onSignedIn, delay = 400 }: { onSignedIn?: (phone: string) => void; delay?: number }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string>()
  const [sending, setSending] = useState(false)
  const [sends, setSends] = useState(0)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [wrong, setWrong] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [resent, setResent] = useState(false)
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const lockLeft = lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : 0
  // a 6th code for the number within the hour is refused
  const limited = sends > 5 ? TOO_MANY_CODES : undefined
  const newCode = () => {
    if (sends >= 5) return setSends(6)
    setSends((n) => n + 1)
    setResendAt(Date.now() + 59_000)
    setLockedUntil(null)
    setWrong(0)
    setCode('')
    setResent(true)
  }

  if (done) return <p role="status">Signed in as +993 {formatNational(phone)}</p>
  return (
    <Frame step={step} size={56}>
      <SignInCodeStep
        aria-labelledby="sign-in-title"
        step={step}
        copy={EN}
        phoneRules={TM}
        size={56}
        phone={phone}
        onPhoneChange={(d) => {
          setPhone(d)
          setPhoneError(undefined)
        }}
        phoneError={phoneError}
        phoneHint={BUSINESS_HINT}
        sending={sending}
        onSendCode={() => {
          if (phone.length !== MARKET.phone.length) return setPhoneError(INCOMPLETE)
          if (!isMobile(phone)) return setPhoneError(NOT_MOBILE)
          setSending(true)
          setTimeout(() => {
            setSending(false)
            setSends(1)
            setResendAt(Date.now() + 59_000)
            setStep('code')
          }, delay)
        }}
        code={code}
        onCodeChange={(next) => {
          setCode(next)
          setResent(false)
        }}
        onSubmitCode={(entered) => {
          setChecking(true)
          setTimeout(() => {
            setChecking(false)
            if (entered === CODES[(sends - 1) % CODES.length]) {
              setDone(true)
              onSignedIn?.(phone)
              return
            }
            if (wrong + 1 >= 3) {
              setWrong(3)
              setCode('')
              setLockedUntil(Date.now() + 60_000)
            } else setWrong(wrong + 1)
          }, delay)
        }}
        shownCode={CODES[(sends - 1) % CODES.length]}
        checking={checking}
        codeError={wrong > 0 && wrong < 3 ? `Wrong code. ${3 - wrong} ${3 - wrong === 1 ? 'try' : 'tries'} left.` : undefined}
        locked={lockLeft > 0 ? `Too many tries. Try again in ${lockLeft} ${lockLeft === 1 ? 'second' : 'seconds'}.` : undefined}
        codeExpired={lockedUntil !== null && lockLeft <= 0}
        resendIn={Math.max(0, Math.ceil((resendAt - now) / 1000))}
        resent={resent}
        onResend={newCode}
        tooManyCodes={limited}
      />
    </Frame>
  )
}

/** Try it: a short or landline number, then the code on screen (any other code is wrong; 3 wrong ones lock for 60 s). */
export const FullFlow: StoryObj<typeof Flow> = {
  name: 'Flow (try it)',
  render: (args) => <Flow {...args} />,
  args: { onSignedIn: fn() },
  play: async ({ args, canvas }) => {
    const phone = canvas.getByLabelText('Phone number')
    await userEvent.type(phone, '651020')
    await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent(INCOMPLETE)
    await userEvent.type(phone, '30{Enter}')
    const code = await canvas.findByLabelText('Code', {}, { timeout: 3000 })
    await waitFor(() => expect(code).toHaveFocus())
    await userEvent.keyboard('1111')
    await expect(await canvas.findByText('Wrong code. 2 tries left.', {}, { timeout: 3000 })).toBeVisible()
    await waitFor(() => expect(code).toHaveFocus())
    await userEvent.keyboard('4821')
    await waitFor(() => expect(args.onSignedIn).toHaveBeenCalledWith('65102030'), { timeout: 3000 })
  },
}

// ---------------------------------------------------------------- inline (My profile's "Change number", B-Shell)

const CHANGE: SignInCodeStepCopy = { ...EN, phoneLabel: 'New phone number', cancel: 'Cancel' }

/** Inside a form with its own primary (My profile): S buttons at the row's end, Cancel beside Send code. */
export const InlinePhone: Story = {
  name: 'Inline · New number',
  args: { step: 'phone', layout: 'inline', copy: CHANGE, onCancel: fn() },
  play: async ({ args, canvas }) => {
    // opened on a tap: the focus is in the field
    await waitFor(() => expect(canvas.getByLabelText('New phone number')).toHaveFocus())
    await userEvent.keyboard('61057732{Enter}')
    await expect(args.onSendCode).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
    await expect(args.onCancel).toHaveBeenCalledOnce()
  },
}

export const InlinePhoneTaken: Story = {
  name: 'Inline · Number taken',
  args: { step: 'phone', layout: 'inline', copy: CHANGE, phone: '61057732', phoneError: 'This number is used by another account' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('This number is used by another account')
  },
}

/** The code: no full-width Confirm (the 4th digit and Enter check it); the resend link and Cancel share a row. */
export const InlineCode: Story = {
  name: 'Inline · Code',
  args: { layout: 'inline', copy: CHANGE, resendIn: 42, onCancel: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Get a new code in 0:42' })).toBeDisabled()
    await userEvent.keyboard('4821')
    await waitFor(() => expect(args.onSubmitCode).toHaveBeenCalledWith('4821'))
  },
}

/** Checking the code: with no Confirm to say so, the hint does. */
export const InlineChecking: Story = {
  name: 'Inline · Checking',
  args: { layout: 'inline', copy: CHANGE, code: '4821', checking: true, resendIn: 42 },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Checking…').find((el) => el.checkVisibility())).toBeVisible()
  },
}

export const InlineLockOver: Story = {
  name: 'Inline · Lock over',
  args: { layout: 'inline', copy: CHANGE, codeExpired: true, resendIn: 0 },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Get a new code' }))
    await expect(args.onResend).toHaveBeenCalled()
  },
}

export const InlinePhoneWidth: Story = {
  name: 'Inline · Code on a phone',
  args: { layout: 'inline', copy: CHANGE, resendIn: 42 },
  globals: { viewport: { value: 'xs' } },
}

export const InlineRussian: Story = {
  name: 'Inline · Russian length',
  args: { layout: 'inline', copy: { ...RU, phoneLabel: 'Новый номер телефона', cancel: 'Отменить' }, resendIn: 42 },
}
