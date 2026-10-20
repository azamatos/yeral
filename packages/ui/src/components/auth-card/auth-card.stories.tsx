/**
 * AuthCard — the business sign-in page's layout (B-Login /login, B-Mobile frame 1; DS-Patterns → «Sign-in»): header
 * with the lockup, a centred card (max 440) with the step's title, lead and body, and a footer link; on phones the card
 * loses its frame. The steps inside are the screen's (SignInCodeStep, name, invite, no workspace, opening); here they
 * stand in with the board's English. No language switcher at the first release (one language).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MARKET } from '@yeral/domain/market'
import { COUNTRY_PREFIX, formatNational } from '@yeral/domain/phone'
import { ArrowRight, Calendar, CalendarX2, Clock, Store, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Logo } from '../../brand'
import { Avatar } from '../avatar'
import { Button } from '../button'
import { Callout } from '../callout'
import { Field } from '../field'
import { Input } from '../input'
import { SignInCodeStep, type SignInCodeStepCopy } from '../sign-in-code-step'
import { AuthCard } from './auth-card'

const TM = { prefix: COUNTRY_PREFIX, maxDigits: MARKET.phone.length, format: formatNational }

const COPY: SignInCodeStepCopy = {
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

/** The header's lockup: the logo and the product tag, read together as the link's name (the screen gives the words). */
function Lockup({ tag = 'Business' }: { tag?: string }) {
  return (
    <a href="#home" className="flex flex-none items-center gap-2.5 rounded-s focus-visible:shadow-focus focus-visible:outline-none">
      <Logo alt="Ýeral" height={30} className="max-sm:h-6.5! max-sm:w-auto" />
      <span className="inline-flex h-5.5 items-center rounded-pill border border-a-line bg-a-50 px-2 text-micro font-semibold text-a-600">
        {tag}
      </span>
    </a>
  )
}

function FooterLink({ children = 'Book on Ýeral as a client', host = 'yeral.app' }: { children?: string; host?: string }) {
  return (
    <a
      href="#client"
      className="inline-flex min-h-8 flex-wrap items-center justify-center gap-2 rounded-s px-1.5 hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none"
    >
      {children}
      <ArrowRight aria-hidden className="size-4" />
      <b className="font-semibold text-a-600">{host}</b>
    </a>
  )
}

/** «You: Gülnar Öwezowa · +993 64 •• •• 90 · Log in with another number» under the steps after the code. */
function AccountLine({ who = 'Gülnar Öwezowa · +993 64 •• •• 90', other = 'Log in with another number' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-n-200 pt-4">
      <span className="text-dense text-n-600">
        You: <span className="font-semibold whitespace-nowrap text-n-900 tabular-nums">{who}</span>
      </span>
      <button
        type="button"
        className="hit inline-flex min-h-8 cursor-pointer items-center rounded-xs text-small font-semibold text-a-600 hover:underline"
      >
        {other}
      </button>
    </div>
  )
}

const meta = {
  title: 'Display/AuthCard',
  component: AuthCard,
  parameters: { layout: 'fullscreen' },
  args: { header: <Lockup />, footer: <FooterLink />, title: 'Log in to Ýeral Business' },
  argTypes: { header: { control: false }, footer: { control: false }, media: { control: false }, children: { control: false } },
} satisfies Meta<typeof AuthCard>
export default meta
type Story = StoryObj<typeof meta>

/** Phone step: the page lead, SignInCodeStep (boxes 56), «No business yet?» under a hairline. */
export const Phone: Story = {
  args: {
    titleId: 'auth-phone',
    lead: 'Enter your phone number — we’ll show you a 4-digit code. No password needed.',
  },
  render: function Render(args) {
    const [phone, setPhone] = useState('')
    return (
      <AuthCard {...args}>
        <SignInCodeStep
          aria-labelledby="auth-phone"
          step="phone"
          size={56}
          copy={COPY}
          phoneRules={TM}
          phone={phone}
          onPhoneChange={setPhone}
          phoneHint="If you already book on Ýeral as a client, use that number — one account works for both."
          sendNote={
            <p className="m-0 text-dense text-n-600">
              By tapping “Send code”, you agree to the{' '}
              <a href="#terms" className="text-a-600 underline">
                Terms of use
              </a>{' '}
              and the{' '}
              <a href="#privacy" className="text-a-600 underline">
                Privacy policy
              </a>
              .
            </p>
          }
        />
        <div className="h-px bg-n-200" />
        <p className="m-0 text-body text-n-600">
          No business yet?{' '}
          <a href="#setup" className="font-semibold text-a-600 hover:underline">
            Start free
          </a>
        </p>
      </AuthCard>
    )
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('banner')).toBeVisible()
    await expect(canvas.getByRole('main')).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 1, name: 'Log in to Ýeral Business' })).toBeVisible()
    // the step's field keeps the focus: the title isn't focusable here
    await expect(canvas.getByRole('heading', { level: 1 })).not.toHaveAttribute('tabindex')
    await expect(canvas.getByRole('form', { name: 'Log in to Ýeral Business' })).toBeVisible()
  },
}

/** Code step with the first-release code on screen; «Change number» sits in the lead. */
export const Code: Story = {
  args: {
    titleId: 'auth-code',
    title: 'Enter the code',
    lead: (
      <>
        To log in with <b className="whitespace-nowrap">+993 65 10 20 30</b>.{' '}
        <button type="button" className="cursor-pointer font-semibold whitespace-nowrap text-a-600 hover:underline">
          Change number
        </button>
      </>
    ),
  },
  render: function Render(args) {
    const [code, setCode] = useState('')
    return (
      <AuthCard {...args}>
        <SignInCodeStep
          aria-labelledby="auth-code"
          step="code"
          size={56}
          copy={COPY}
          phoneRules={TM}
          code={code}
          onCodeChange={setCode}
          shownCode="4821"
          resendIn={42}
        />
      </AuthCard>
    )
  },
}

/** A new person after the code: name (required) and surname (optional). */
export const Name: Story = {
  args: {
    title: 'What’s your name?',
    lead: 'Your number is verified. Enter your name for your Ýeral account — your team will see you by this name.',
  },
  render: (args) => (
    <AuthCard {...args}>
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        <Field label="First name">
          <Input autoComplete="given-name" placeholder="For example: Gülälek" />
        </Field>
        <Field label="Last name (optional)">
          <Input autoComplete="family-name" />
        </Field>
        <Button type="submit" variant="primary" size="l" className="w-full">
          Continue
        </Button>
      </form>
    </AuthCard>
  ),
}

/** An invite after the code: the workspace above the title, a label, the level's lines, Accept · Decline. */
export const Invite: Story = {
  args: {
    focusKey: 'invite',
    eyebrow: 'Invite',
    title: 'Glow Studio invites you to the team',
    media: (
      <div className="flex min-w-0 items-center gap-3.5">
        <Avatar name="Glow Studio" size={56} tone="neutral" className="rounded-l" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[17px] leading-6 font-semibold">Glow Studio</span>
          <span className="text-dense text-n-600">Beauty · Ashgabat</span>
        </span>
      </div>
    ),
    lead: (
      <span className="flex items-center gap-2.5 text-n-900">
        <Avatar name="Maýsa Annaýewa" size={32} />
        <span>
          Maýsa Annaýewa added you as <b>Specialist</b>
        </span>
      </span>
    ),
  },
  render: (args) => (
    <AuthCard {...args}>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {[
          [Calendar, 'You’ll see your own calendar and bookings'],
          [Clock, 'You can answer your own requests'],
          [UsersRound, 'You’ll see your own clients and earnings'],
        ].map(([Icon, text]) => {
          const I = Icon as typeof Calendar
          return (
            <li key={text as string} className="flex items-center gap-3 text-body">
              <span className="inline-flex size-9 flex-none items-center justify-center rounded-pill bg-group">
                <I aria-hidden className="size-4.5" />
              </span>
              {text as string}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="l" className="w-full">
          Accept
        </Button>
        <Button variant="secondary" size="l" className="w-full">
          Decline
        </Button>
      </div>
      <AccountLine />
    </AuthCard>
  ),
  play: async ({ canvas }) => {
    // a step without a field: the title takes the focus, so a screen reader starts there
    await waitFor(() => expect(canvas.getByRole('heading', { level: 1 })).toHaveFocus())
  },
}

/** No workspace yet: an icon tile above the title, the one primary, a quiet note, the account line. */
export const Empty: Story = {
  args: {
    focusKey: 'empty',
    title: 'You don’t have a workspace yet',
    lead: 'Open your business: calendar, online booking and a client list — free.',
    media: (
      <span className="flex size-12 items-center justify-center rounded-pill bg-group" aria-hidden>
        <Store className="size-5.5" />
      </span>
    ),
  },
  render: (args) => (
    <AuthCard {...args}>
      <Button variant="primary" size="l" className="w-full">
        Create a business
      </Button>
      <Callout tone="neutral" icon={<UsersRound />}>
        Work at a business? Ask the owner to send an invite to your phone number — it will appear here.
      </Callout>
      <AccountLine who="Gülälek Ataýewa · +993 63 77 45 12" />
    </AuthCard>
  ),
}

/** The expired invite: an icon tile, the dates, what to do. */
export const InviteExpired: Story = {
  name: 'Invite expired',
  args: {
    focusKey: 'expired',
    title: 'The invite has expired',
    lead: 'Each invite works for 7 days. The invite Glow Studio sent on 14 October ended on 21 October.',
    media: (
      <span className="flex size-12 items-center justify-center rounded-pill bg-group" aria-hidden>
        <CalendarX2 className="size-5.5" />
      </span>
    ),
  },
  render: (args) => (
    <AuthCard {...args}>
      <Callout tone="neutral">Ask the owner to send it again — the new invite will appear here.</Callout>
      <AccountLine />
    </AuthCard>
  ),
}

/** Opening the last used workspace: centred, a progress bar, a way to skip the wait. */
export const Opening: Story = {
  args: {
    focusKey: 'opening',
    align: 'center',
    title: 'Opening Glow Studio…',
    lead: 'Owner · Ashgabat',
    media: <Avatar name="Glow Studio" size={56} className="size-16 rounded-card text-[24px]" />,
  },
  render: (args) => (
    <AuthCard {...args}>
      <p className="m-0 max-w-85 text-dense text-n-600">
        You have 2 workspaces. We open the one you used last; pick the other at the top of the left menu.
      </p>
      <a href="#calendar" className="inline-flex items-center gap-1.5 text-small font-semibold text-a-600 hover:underline">
        Open the calendar now
        <ArrowRight aria-hidden className="size-4" />
      </a>
    </AuthCard>
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('heading', { level: 1, name: 'Opening Glow Studio…' })).toHaveFocus())
  },
}

/** Moving between steps: the title takes the focus each time the step changes. */
export const FocusOnStepChange: Story = {
  name: 'Focus on step change',
  args: { title: 'Glow Studio invites you to the team' },
  render: function Render(args) {
    const [step, setStep] = useState<'invite' | 'empty'>('invite')
    return (
      <AuthCard {...args} focusKey={step} title={step === 'invite' ? args.title : 'You don’t have a workspace yet'}>
        <Button variant="secondary" size="l" className="w-full" onClick={() => setStep('empty')}>
          Decline
        </Button>
      </AuthCard>
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Decline' }))
    const title = canvas.getByRole('heading', { level: 1, name: 'You don’t have a workspace yet' })
    await waitFor(() => expect(title).toHaveFocus())
  },
}

/** Under 768 the card loses its frame and padding; the title drops to 24/30. */
export const PhoneViewport: Story = {
  name: 'Phone viewport',
  ...Phone,
  globals: { viewport: { value: 'xs' } },
}

/** Russian runs ~30% longer: the title wraps, nothing has a fixed width. */
export const LongText: Story = {
  name: 'Long text (Russian)',
  args: {
    header: <Lockup tag="Бизнес" />,
    footer: <FooterLink host="yeral.app">Записаться на Ýeral как клиент</FooterLink>,
    focusKey: 'empty',
    title: 'У вас пока нет рабочего пространства',
    lead: 'Откройте свой бизнес: календарь, онлайн-запись и база клиентов — бесплатно.',
    media: (
      <span className="flex size-12 items-center justify-center rounded-pill bg-group" aria-hidden>
        <Store className="size-5.5" />
      </span>
    ),
  },
  render: (args) => (
    <AuthCard {...args}>
      <Button variant="primary" size="l" className="w-full">
        Создать бизнес
      </Button>
      <Callout tone="neutral" icon={<UsersRound />}>
        Работаете в бизнесе? Попросите владельца отправить приглашение на ваш номер — оно появится здесь.
      </Callout>
      <AccountLine who="Гюлялек Атаева · +993 63 77 45 12" other="Войти с другим номером" />
    </AuthCard>
  ),
}
