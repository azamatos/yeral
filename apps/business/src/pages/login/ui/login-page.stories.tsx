/**
 * `/login` — B-Login (v0.6, English), book B-07–B-09. The page runs as in the app: the real sdk and query cache over a
 * `fetch` that answers like the api (contract-shaped bodies and errors; any code but the right one is wrong, 3 wrong
 * ones lock), so each story walks a sign-in and checks what the board draws at every step.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SUPPORT_LINE } from '@yeral/features/contact-yeral'
import { useParams } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { InviteCard, Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { LoginPage } from './login-page'

const DAY = 86_400_000
const city = { id: 'ashgabat', name: 'Ashgabat' }
const notifications = { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false }

const person = (phone: string, firstName: string | null, surname: string | null = null): Me => ({
  id: `u-${phone}`,
  name: firstName && [firstName, surname].filter(Boolean).join(' '),
  firstName,
  surname,
  phone,
  lang: 'en',
  notifications,
  hasBusiness: false,
  canChangePhone: true,
  demo: false,
  photo: null,
})

const workspace = (slug: string, name: string, level: Workspace['level'], lastOpenedAt: number | null): Workspace => ({
  slug,
  name,
  address: '247 Bitarap Türkmenistan Avenue',
  city,
  logo: null,
  level,
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt,
})

const invite = (
  state: InviteCard['state'],
  expiresAt: number,
  {
    id = 'inv-1',
    slug = 'glow-studio',
    name = 'Glow Studio',
    level = 'specialist',
    answersRequests = true,
  }: Partial<{ id: string; slug: string; name: string; level: InviteCard['level']; answersRequests: boolean }> = {},
): InviteCard => ({
  id,
  business: { slug, name, category: 'Beauty', address: '247 Bitarap Türkmenistan Avenue', city, logo: null },
  invitedBy: 'Maýsa Annaýewa',
  level,
  answersRequests,
  state,
  sentAt: expiresAt - 7 * DAY,
  expiresAt,
})

/** Who is behind each number (business demo data, B-Login's accounts). */
interface Account {
  me: Me
  workspaces: Workspace[]
  current: string | null
  invites: InviteCard[]
  /** Unused for 6 months: "Is this you?" first (book Q-270). */
  unused?: boolean
}

const PEOPLE: Record<string, Account> = {
  '+99365102030': {
    me: person('+99365102030', 'Maýsa', 'Annaýewa'),
    workspaces: [workspace('glow-studio', 'Glow Studio', 'owner', 2), workspace('maysa-home', 'Maýsa’s studio', 'owner', 1)],
    current: 'glow-studio',
    invites: [],
  },
  // an owner unused for 6 months: "No" can't start the number afresh (`owns_workspace`)
  '+99365400700': {
    me: person('+99365400700', 'Merdan', 'Ataýew'),
    workspaces: [workspace('merdan-barber', 'Merdan’s barber', 'owner', 0)],
    current: 'merdan-barber',
    invites: [],
    unused: true,
  },
  '+99364215590': {
    me: person('+99364215590', 'Gülnar', 'Öwezowa'),
    workspaces: [],
    current: null,
    invites: [invite('pending', Date.now() + 3 * DAY)],
  },
  '+99362481530': { me: person('+99362481530', 'Jeren'), workspaces: [], current: null, invites: [invite('expired', Date.now() - DAY)] },
  // the invite ended over a week ago: the no-workspace card has taken over
  '+99362481531': {
    me: person('+99362481531', 'Jeren'),
    workspaces: [],
    current: null,
    invites: [invite('expired', Date.now() - 8 * DAY)],
  },
  // two businesses invited the same number: one card after the other
  '+99363110022': {
    me: person('+99363110022', 'Merjen', 'Annaýewa'),
    workspaces: [],
    current: null,
    invites: [
      invite('pending', Date.now() + 3 * DAY),
      // an Admin where each specialist answers their own requests: reviews only
      invite('pending', Date.now() + 5 * DAY, {
        id: 'inv-2',
        slug: 'glow-nails',
        name: 'Glow Nails',
        level: 'admin',
        answersRequests: false,
      }),
    ],
  },
  // a member with an invite: a decline goes on to the workspace used last
  '+99365884102': {
    me: person('+99365884102', 'Selbi', 'Hojaýewa'),
    workspaces: [workspace('selbi-studio', 'Selbi’s studio', 'owner', 1)],
    current: 'selbi-studio',
    invites: [invite('pending', Date.now() + 3 * DAY)],
  },
  // an Admin and a Specialist invited where they won't answer requests
  '+99363110033': {
    me: person('+99363110033', 'Ogulşat', 'Berdiýewa'),
    workspaces: [],
    current: null,
    invites: [invite('pending', Date.now() + 5 * DAY, { level: 'admin', answersRequests: false })],
  },
  '+99363110044': {
    me: person('+99363110044', 'Leýli', 'Gurbanowa'),
    workspaces: [],
    current: null,
    invites: [invite('pending', Date.now() + 5 * DAY, { answersRequests: false })],
  },
  '+99365312210': {
    me: person('+99365312210', 'Aýna', 'Myradowa'),
    workspaces: [workspace('glow-studio', 'Glow Studio', 'specialist', 1)],
    current: 'glow-studio',
    invites: [],
    unused: true,
  },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const refuse = (status: number, code: string, details?: Record<string, unknown>) => json({ error: { code, details } }, status)

/**
 * The api as the sign-in uses it, with its own copy of the accounts. `showCode`: first-launch mode, the code comes
 * back with `POST /auth/code`. `signedIn`: someone is signed in when the page opens. `lockSec`: how long 3 wrong codes
 * lock (60 on the api). `codes`: codes this number already had this hour.
 */
const fakeApi =
  ({
    showCode = true,
    signedIn,
    lockSec = 60,
    codes = 0,
    resendSec = 59,
    sessionEnds = false,
  }: { showCode?: boolean; signedIn?: string; lockSec?: number; codes?: number; resendSec?: number; sessionEnds?: boolean } = {}) =>
  (): typeof fetch => {
    const ACCOUNTS = structuredClone(PEOPLE)
    const CODES = ['4821', '7305', '1946', '5582', '3067']
    let sent = codes
    let sentAt = 0
    let wrong = 0
    let phone: string | undefined
    let me: Me | null = signedIn ? (ACCOUNTS[signedIn]?.me ?? null) : null
    let account: Account | undefined = signedIn ? ACCOUNTS[signedIn] : undefined
    const fresh = (number: string): Account => ({ me: person(number, null), workspaces: [], current: null, invites: [] })

    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init)
      const path = new URL(request.url).pathname.replace(/^\/v1/, '')
      const body = (request.method === 'GET' ? {} : await request.json().catch(() => ({}))) as Record<string, unknown>
      const route = `${request.method} ${path}`

      if (route === 'GET /auth/mode') return json({ codeOnScreen: showCode })
      if (route === 'POST /auth/code') {
        // 5 codes an hour for one number (book Q-267)
        if (sent >= 5) return refuse(429, 'rate_limited', { retryAfterSec: 2520, retryAfterMin: 42 })
        // the code sent less than a minute ago still works
        if (body.phone === phone && Date.now() - sentAt < resendSec * 1000) return refuse(429, 'resend_too_soon', { retryAfterSec: 50 })
        phone = String(body.phone)
        sentAt = Date.now()
        sent += 1
        wrong = 0
        return json({ resendAfterSec: 59, expiresInSec: 300, ...(showCode ? { code: CODES[(sent - 1) % CODES.length] } : {}) })
      }
      if (route === 'POST /auth/verify') {
        if (wrong >= 3) return refuse(429, 'too_many_attempts', { retryAfterSec: lockSec })
        if (body.code !== CODES[(sent - 1) % CODES.length]) {
          wrong += 1
          return wrong >= 3
            ? refuse(429, 'too_many_attempts', { retryAfterSec: lockSec })
            : refuse(400, 'code_invalid', { attemptsLeft: 3 - wrong })
        }
        account = ACCOUNTS[String(body.phone)] ?? fresh(String(body.phone))
        if (account.unused) return json({ isThisYou: { name: account.me.firstName, ticket: 'ticket-1234567890' } }, 202)
        me = account.me
        return json({ me, isNew: !me.firstName })
      }
      if (route === 'POST /auth/identity') {
        if (!account || !phone) return refuse(400, 'code_expired')
        if (!body.yes && account.workspaces.some((w) => w.level === 'owner')) return refuse(409, 'owns_workspace')
        account = body.yes ? account : fresh(phone)
        me = account.me
        return json({ me, isNew: !me.firstName })
      }
      if (route === 'POST /auth/logout') {
        me = null
        return new Response(null, { status: 204 })
      }
      if (!me || !account) return refuse(401, 'unauthorized')
      // the session ended elsewhere: the page still has `me`, the next questions get 401
      if (sessionEnds && route !== 'GET /me') {
        me = null
        return refuse(401, 'unauthorized')
      }
      const signedInAs = account
      if (route === 'GET /me') return json(me)
      if (route === 'PATCH /me') {
        me = {
          ...me,
          firstName: String(body.firstName),
          surname: (body.surname as string | null) ?? null,
          name: [body.firstName, body.surname].filter(Boolean).join(' '),
        }
        signedInAs.me = me
        return json(me)
      }
      if (route === 'GET /me/invites')
        return json({ items: signedInAs.invites.filter((i) => i.state === 'pending' || i.state === 'expired') })
      if (route === 'GET /me/workspaces') return json({ items: signedInAs.workspaces, current: signedInAs.current })
      const answer = /^POST \/me\/invites\/([^/]+)\/(accept|decline)$/.exec(route)
      if (answer) {
        const found = signedInAs.invites.find((i) => i.id === answer[1])
        if (!found) return refuse(404, 'not_found')
        found.state = answer[2] === 'accept' ? 'accepted' : 'declined'
        if (answer[2] === 'decline') return new Response(null, { status: 204 })
        // as the api: joining makes it the workspace opened last
        const joined = workspace(found.business.slug, found.business.name, found.level, Date.now())
        signedInAs.workspaces.push(joined)
        signedInAs.current = joined.slug
        return json(joined)
      }
      const opened = /^POST \/me\/workspaces\/([^/]+)\/open$/.exec(route)
      if (opened) {
        signedInAs.current = opened[1] ?? null
        return new Response(null, { status: 204 })
      }
      return refuse(404, 'not_found')
    }
  }

/** Where the sign-in leads: stand-ins that say where the router went. */
function Calendar() {
  const { slug } = useParams({ strict: false })
  return <p>Calendar of {slug}</p>
}
function Setup() {
  const { step } = useParams({ strict: false })
  return <p>Setup: {step}</p>
}
const routes = { '/login': LoginPage, '/w/$slug/calendar': Calendar, '/setup/$step': Setup }

const meta = {
  title: 'Business/Access/LoginFlow',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes, path: '/login', server: fakeApi() },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']

/** A message the step also reads out (its live region repeats it): the one on screen. */
async function shown(canvas: Canvas, text: string | RegExp, timeout = 1000) {
  const [first] = await canvas.findAllByText(text, {}, { timeout })
  await expect(first).toBeVisible()
}

async function sendCode(canvas: Canvas, digits: string) {
  const phone = await canvas.findByLabelText('Phone number')
  await userEvent.clear(phone)
  await userEvent.type(phone, digits)
  await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
  return canvas.findByLabelText('Code', {}, { timeout: 3000 })
}

/** The phone step: the page lead, the hint, the checks before a code is asked for, "Start free". */
export const Phone: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Log in to Ýeral Business' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Log in · Ýeral Business'))
    // the first launch shows the code on the screen: the phone step says it's a demo (book Q-036)
    await expect(await canvas.findByText(/This is a demo of Ýeral: the sign-in code shows here instead of an SMS/)).toBeVisible()
    const phone = canvas.getByLabelText('Phone number')
    await expect(phone).toHaveAccessibleDescription(
      'If you already book on Ýeral as a client, use that number — one account works for both.',
    )
    await userEvent.type(phone, '651020')
    await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The number is incomplete — it needs 8 digits.')
    await userEvent.clear(phone)
    await userEvent.type(phone, '12456789{Enter}')
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Codes go to mobile numbers only. Enter a number starting with 6 or 7.',
    )
    await userEvent.click(canvas.getByRole('link', { name: 'Start free' }))
    await expect(await canvas.findByText('Setup: phone')).toBeVisible()
  },
}

export const PhoneViewport: Story = { name: 'Phone · on a phone', globals: { viewport: { value: 'xs' } } }

/** A member: the code on screen, a wrong code, the right one, then the workspace used last opens. */
export const Member: Story = {
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    const code = await sendCode(canvas, '65102030')
    await expect(canvas.getByRole('heading', { level: 1, name: 'Enter the code' })).toBeVisible()
    await expect(canvas.getByText('+993 65 10 20 30')).toBeVisible()
    await expect(canvas.getByText('4821')).toBeVisible()
    await waitFor(() => expect(code).toHaveFocus())
    await userEvent.keyboard('1111')
    await expect(await canvas.findByText('Wrong code. 2 tries left.')).toBeVisible()
    await userEvent.keyboard('4821')
    const opening = await canvas.findByRole('heading', { level: 1, name: 'Opening Glow Studio…' })
    await expect(canvas.getByText('Owner · Ashgabat')).toBeVisible()
    await expect(canvas.getByText(/You have 2 workspaces/)).toBeVisible()
    await waitFor(() => expect(opening).toHaveFocus())
    await expect(await canvas.findByText('Calendar of glow-studio', {}, { timeout: 4000 })).toBeVisible()
  },
}

/** Change number, then the same number again: the code sent a moment ago still works and stays on screen. */
export const ChangeNumber: Story = {
  name: 'Change number',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65102030')
    await expect(canvas.getByText('4821')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Change number' }))
    const phone = await canvas.findByLabelText('Phone number')
    // the field takes the focus, not the page
    await waitFor(() => expect(phone).toHaveFocus())
    await expect(phone).toHaveValue('65 10 20 30')
    await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
    await canvas.findByLabelText('Code')
    await expect(canvas.getByText('4821')).toBeVisible()
    await expect(canvas.getByRole('button', { name: /Get a new code in 0:[45]\d/ })).toBeDisabled()
  },
}

/** Signed in a moment ago, but the session ended elsewhere: back to the sign-in, not a dead end. */
export const SessionEnded: Story = {
  name: 'Session ended',
  args: { server: fakeApi({ signedIn: '+99365102030', sessionEnds: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Phone number', {}, { timeout: 3000 })).toBeVisible()
    await expect(canvas.queryByText('Something went wrong')).not.toBeInTheDocument()
  },
}

/** Without the first-launch code (the api doesn't hand it out): the plain code step, no callout. */
export const CodeNotShown: Story = {
  name: 'Code not on screen',
  args: { server: fakeApi({ showCode: false }) },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65102030')
    await expect(canvas.queryByText('Your code:')).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /Get a new code in 0:5\d/ })).toBeDisabled()
    // no demo note once codes go by SMS (nor on the code step)
    await expect(canvas.queryByText(/This is a demo/)).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Change number' }))
    await canvas.findByLabelText('Phone number')
    await expect(canvas.queryByText(/This is a demo/)).not.toBeInTheDocument()
  },
}

/** A new person: the name (first name required), then no workspace yet. */
export const NewPerson: Story = {
  name: 'New person',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '63774512')
    await userEvent.keyboard('4821')
    const first = await canvas.findByLabelText('First name')
    await expect(canvas.getByText('+993 63 77 45 12')).toBeVisible()
    await waitFor(() => expect(first).toHaveFocus())
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Enter your first name.')
    await userEvent.type(first, 'Gülälek')
    await userEvent.type(canvas.getByLabelText('Last name (optional)'), 'Ataýewa')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'You don’t have a workspace yet' })).toBeVisible()
    await expect(canvas.getByText('Gülälek Ataýewa · +993 63 77 45 12')).toBeVisible()
    await userEvent.click(canvas.getByRole('link', { name: 'Create a business' }))
    await expect(await canvas.findByText('Setup: business')).toBeVisible()
  },
}

/** An invite waiting: the card, then Decline asks once and the no-workspace card says it was declined. */
export const InviteDeclined: Story = {
  name: 'Invite · declined',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '64215590')
    await userEvent.keyboard('4821')
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio invites you to the team' })).toBeVisible()
    await expect(canvas.getByText('Beauty · Ashgabat')).toBeVisible()
    await expect(canvas.getByText('You can answer your own requests')).toBeVisible()
    await expect(canvas.getByText('Gülnar Öwezowa · +993 64 •• •• 90')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Decline' }))
    const question = await canvas.findByText('Decline the invite?')
    await waitFor(() => expect(question).toHaveFocus())
    await userEvent.click(canvas.getByRole('button', { name: 'Decline invite' }))
    await expect(await canvas.findByText('You declined Glow Studio’s invite.')).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 1, name: 'You don’t have a workspace yet' })).toBeVisible()
  },
}

/** Accept: the person joins, and that workspace's calendar opens at once, as drawn (no "Opening…" card). */
export const InviteAccepted: Story = {
  name: 'Invite · accepted',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '64215590')
    await userEvent.keyboard('4821')
    await userEvent.click(await canvas.findByRole('button', { name: 'Accept' }))
    // at once: well before the 1.5 s an "Opening …" card would take
    await expect(await canvas.findByText('Calendar of glow-studio', {}, { timeout: 1000 })).toBeVisible()
    await expect(canvas.queryByText('Opening Glow Studio…')).not.toBeInTheDocument()
  },
}

/** Two invites: after the first Accept the second card shows; accepting that one opens its calendar. */
export const TwoInvites: Story = {
  name: 'Invite · two waiting',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '63110022')
    await userEvent.keyboard('4821')
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio invites you to the team' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Accept' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Nails invites you to the team' })).toBeVisible()
    await expect(canvas.getByText('As an Admin')).toBeVisible()
    await expect(canvas.getByText('You’ll see every calendar, booking and client')).toBeVisible()
    // she won't answer requests there: an Admin still replies to reviews
    await expect(canvas.queryByText('You can answer requests and reply to reviews')).not.toBeInTheDocument()
    await expect(canvas.getByText('You can reply to reviews')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Accept' }))
    await expect(await canvas.findByText('Calendar of glow-nails', {}, { timeout: 1000 })).toBeVisible()
  },
}

/**
 * Invited where they won't answer requests (`answersRequests` false: the business's "who answers", instant
 * confirmation): an Administrator's card says reviews only (book chapter 3), a Specialist's loses the requests line.
 */
export const InviteNotAnswering: Story = {
  name: 'Invite · not answering requests',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '63110033')
    await userEvent.keyboard('4821')
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio invites you to the team' })).toBeVisible()
    await expect(canvas.getByText('As an Admin')).toBeVisible()
    const admin = within(canvas.getByRole('list'))
    await expect(admin.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'You’ll see every calendar, booking and client',
      'You can reply to reviews',
      'You can change services, prices and settings',
    ])
  },
}

export const InviteNotAnsweringSpecialist: Story = {
  name: 'Invite · not answering requests (Specialist)',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '63110044')
    await userEvent.keyboard('4821')
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio invites you to the team' })).toBeVisible()
    await expect(canvas.getByRole('list').querySelectorAll('li')).toHaveLength(2)
    await expect(canvas.queryByText('You can answer your own requests')).not.toBeInTheDocument()
  },
}

/** A member declines: the decline is confirmed on the card that opens the workspace used last. */
/** Accept one, then decline the other: the decline is the latest answer, confirmed on the card opening the one joined. */
export const AcceptThenDecline: Story = {
  name: 'Invite · accept one, decline the other',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '63110022')
    await userEvent.keyboard('4821')
    await userEvent.click(await canvas.findByRole('button', { name: 'Accept' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Nails invites you to the team' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Decline' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Decline invite' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Opening Glow Studio…' })).toBeVisible()
    await expect(canvas.getByText('You declined Glow Nails’s invite.')).toBeVisible()
    await expect(await canvas.findByText('Calendar of glow-studio', {}, { timeout: 4000 })).toBeVisible()
  },
}

export const InviteDeclinedByMember: Story = {
  name: 'Invite · declined by a member',
  args: { server: fakeApi({ signedIn: '+99365884102' }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Decline' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Decline invite' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Opening Selbi’s studio…' })).toBeVisible()
    await expect(canvas.getByText('You declined Glow Studio’s invite.')).toBeVisible()
    await expect(await canvas.findByText('Calendar of selbi-studio', {}, { timeout: 4000 })).toBeVisible()
  },
}

/** Signed in already, no workspace, and the invite ran out: the expired card says why, with the number masked. */
export const InviteExpired: Story = {
  name: 'Invite · expired',
  args: { server: fakeApi({ signedIn: '+99362481530' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'The invite has expired' })).toBeVisible()
    await expect(canvas.getByText(/Each invite works for 7 days\. The invite Glow Studio sent on/)).toBeVisible()
    await expect(canvas.getByText('Jeren · +993 62 •• •• 30')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Log in with another number' }))
    await expect(await canvas.findByLabelText('Phone number')).toBeVisible()
  },
}

/** An invite that ended over a week ago: "You don't have a workspace yet", with a way to create one. */
export const InviteExpiredLongAgo: Story = {
  name: 'Invite · expired over a week ago',
  args: { server: fakeApi({ signedIn: '+99362481531' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'You don’t have a workspace yet' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Create a business' })).toBeVisible()
  },
}

/** Three wrong codes lock the step; when the lock ends the old code is dead and a new one brings the step back. */
export const Locked: Story = {
  args: { server: fakeApi({ lockSec: 2, resendSec: 0 }) },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65102030')
    await userEvent.keyboard('1111')
    await canvas.findByText('Wrong code. 2 tries left.')
    await userEvent.keyboard('2222')
    await canvas.findByText('Wrong code. 1 try left.')
    await userEvent.keyboard('3333')
    await shown(canvas, /Too many tries\. Try again in [12] seconds?\./)
    await expect(canvas.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    await shown(canvas, 'The old code no longer works.', 4000)
    await userEvent.click(canvas.getByRole('button', { name: 'Get a new code' }))
    await shown(canvas, 'Here’s a new code.')
    await expect(canvas.getByText('7305')).toBeVisible()
  },
}

/** The sixth code in an hour for one number: the wait in minutes replaces Send code. */
export const TooManyCodes: Story = {
  name: 'Too many codes',
  args: { server: fakeApi({ codes: 5 }) },
  play: async ({ canvas }) => {
    const phone = await canvas.findByLabelText('Phone number')
    await userEvent.type(phone, '65102030{Enter}')
    await shown(canvas, 'Too many codes. Try again in 42 minutes.')
    await expect(canvas.queryByRole('button', { name: 'Send code' })).not.toBeInTheDocument()
  },
}

/** An account unused for 6 months: "Is this you?" before anyone signs in; yes signs in to it. */
export const IsThisYou: Story = {
  name: 'Is this you?',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65312210')
    await userEvent.keyboard('4821')
    const title = await canvas.findByRole('heading', { level: 1, name: 'Is this you, Aýna?' })
    await waitFor(() => expect(title).toHaveFocus())
    await userEvent.click(canvas.getByRole('button', { name: 'Yes, it’s me' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Opening Glow Studio…' })).toBeVisible()
    await expect(canvas.getByText('Specialist · Ashgabat')).toBeVisible()
  },
}

/** "No" from a business's owner: the number can't start afresh; Contact Ýeral takes the focus. */
export const IsThisYouOwner: Story = {
  name: 'Is this you? · an owner says no',
  args: { server: fakeApi() },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65400700')
    await userEvent.keyboard('4821')
    await canvas.findByRole('heading', { level: 1, name: 'Is this you, Merdan?' })
    await userEvent.click(canvas.getByRole('button', { name: /No/ }))
    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('This account owns a business on Ýeral')
    // the focus moves from the No button, now off, to Contact Ýeral
    const contact = within(alert).getByRole('button', { name: 'Contact Ýeral' })
    await waitFor(() => expect(contact).toHaveFocus())
    await userEvent.click(contact)
    const menu = await within(document.body).findByRole('menu', { name: 'Contact Ýeral' })
    await expect(within(menu).getByRole('menuitem', { name: `Call ${SUPPORT_LINE.phone}` })).toHaveAttribute('href', SUPPORT_LINE.phoneHref)
    await userEvent.keyboard('{Escape}')
    await expect(canvas.getByRole('button', { name: /No/ })).toBeDisabled()
  },
}

/** No connection: the step stays and a toast says so. */
export const Offline: Story = {
  args: { server: () => () => Promise.reject(new TypeError('offline')) },
  play: async ({ canvas }) => {
    // who is signed in can't be asked: the page offers to try again
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible()
  },
}
