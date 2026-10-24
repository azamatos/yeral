/**
 * Settings → Team — B-Team `tab=team` (v0.6 round 3, English), in the app's shell and Settings' frame over a `fetch`
 * that answers like the api: Specialists, Management, Invites and those no longer on the team, each row with its access
 * level, services, hours and status; the owner's invite actions and Reactivate; the administrator's view-only page.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { TeamMember, Workspace } from '@yeral/contract/team'
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsTeamPage } from './settings-team-page'

const me: Me = {
  id: 'u-maysa',
  name: 'Maýsa Annaýewa',
  firstName: 'Maýsa',
  surname: 'Annaýewa',
  phone: '+99365102030',
  lang: 'en',
  notifications: { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false },
  hasBusiness: true,
  canChangePhone: true,
  demo: false,
  photo: null,
}

const glow = (level: Workspace['level']): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: '247 Bitarap Türkmenistan Avenue',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level,
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt: 1,
})

const DAY = 86_400_000
const now = Date.now()
const person = (id: string, name: string, level: TeamMember['level'], patch: Partial<TeamMember> = {}): TeamMember => ({
  id,
  name,
  fullName: null,
  specialization: null,
  phone: '+99365000000',
  level,
  status: 'active',
  hasApp: true,
  bookable: level !== 'admin',
  canAnswerOwn: false,
  joined: true,
  photo: null,
  invite: null,
  ...patch,
})
const invite = (state: 'pending' | 'expired' | 'declined', days: number) => ({
  id: `i-${state}`,
  state,
  sentAt: now - DAY,
  expiresAt: now + days * DAY,
})

/** Glow Studio's team (demo-data v06r3): the owner, an admin, specialists with and without the app, invites, Aýna removed. */
const team: TeamMember[] = [
  person('maysa', 'Maýsa', 'owner', { fullName: 'Maýsa Annaýewa', phone: '+99365102030' }),
  person('selbi', 'Selbi', 'admin', { fullName: 'Selbi Orazowa', phone: '+99365884102' }),
  person('maral', 'Maral', 'specialist', { fullName: 'Maral Ataýewa', specialization: 'Nail artist' }),
  person('jeren', 'Jeren', 'specialist', { fullName: 'Jeren Hojaýewa', specialization: 'Hair stylist' }),
  person('leyli', 'Leýli', 'specialist', {
    fullName: 'Leýli Berdiýewa',
    specialization: 'Massage therapist',
    hasApp: false,
    joined: false,
    phone: '+99365441122',
    invite: invite('pending', 5),
  }),
  person('gulnar', 'Gülnar', 'specialist', {
    fullName: 'Gülnar Öwezowa',
    status: 'invited',
    joined: false,
    phone: '+99364551290',
    invite: invite('pending', 6),
  }),
  person('ogul', 'Ogul', 'specialist', { status: 'invited', joined: false, phone: '+99361223344', invite: invite('expired', -2) }),
  person('ayna', 'Aýna', 'specialist', { fullName: 'Aýna Myradowa', status: 'removed', specialization: 'Hair stylist' }),
]
const menu = {
  groups: [
    {
      id: 'g1',
      name: 'Nails',
      services: [
        { id: 's1', staffIds: ['maral'] },
        { id: 's2', staffIds: ['maral'] },
      ],
    },
    { id: 'g2', name: 'Hair', services: [{ id: 's3', staffIds: ['jeren'] }] },
    { id: 'g3', name: 'Massage', services: [{ id: 's4', staffIds: ['leyli'] }] },
  ],
}
/** Jeren works her own shift; the others follow the business hours. */
const scheduleOf = (id: string) => ({
  shift: id === 'jeren' ? [...Array.from({ length: 6 }, () => ({ open: 720, close: 1140 })), null] : null,
  breaks: Array(7).fill(null),
  daysOff: [],
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it. */
const fakeApi =
  (level: Workspace['level']): (() => typeof fetch) =>
  () => {
    let people = team
    // eslint-disable-next-line @typescript-eslint/require-await -- the fetch it stands in for answers a promise
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      const w = glow(level)
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /w/glow-studio/team') return json({ items: people })
      if (route === 'GET /w/glow-studio/services') return json(menu)
      const one = /^(GET|POST|DELETE) \/w\/glow-studio\/team\/([^/]+)\/(schedule|invite|reactivate)$/.exec(route)
      if (one) {
        const [, method, id, what] = one
        const m = people.find((p) => p.id === id)!
        if (what === 'schedule') return json(scheduleOf(id!))
        // as the api: someone removed before they joined comes back invited, without a new invite
        if (what === 'reactivate') {
          people = people.map((p) => (p.id === id ? { ...p, status: p.joined ? 'active' : 'invited' } : p))
          return json(people.find((p) => p.id === id))
        }
        if (method === 'DELETE') {
          people = people.map((p) => (p.id === id ? { ...p, invite: p.invite && { ...p.invite, state: 'cancelled' } } : p))
          return new Response(null, { status: 204 })
        }
        const sent = { ...m, invite: invite('pending', 7) }
        people = people.map((p) => (p.id === id ? sent : p))
        return json({ member: sent, link: `https://business.yeral.localhost/invite/${id}-token-0123456789` }, 201)
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

const section = (name: string) => () => <SettingsPlaceholder section={name as 'profile'} />
const layouts = {
  '/w/$slug': {
    component: WorkspaceShell,
    children: {
      settings: {
        component: SettingsLayoutPage,
        children: {
          profile: section('profile'),
          rules: section('rules'),
          hours: section('hours'),
          services: section('services'),
          team: SettingsTeamPage,
          permissions: section('permissions'),
          link: section('link'),
        },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/Team',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/team', server: fakeApi('owner') },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** The owner's team: the groups, each row's level, services, hours and status. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Team' })).toBeVisible()
    const specialists = within(await canvas.findByRole('group', { name: 'Specialists' }))
    await expect(specialists.getByText('Maral Ataýewa')).toBeVisible()
    await expect(await specialists.findByText('2 services')).toBeVisible()
    await expect(await specialists.findByText('Own shift')).toBeVisible()
    await expect(specialists.getByText('12:00–19:00')).toBeVisible()
    // Leýli works without the app until she accepts her invite
    await expect(specialists.getByText('Doesn’t use the app')).toBeVisible()
    await expect(specialists.getByText('works without the app until they accept')).toBeVisible()
    const management = within(canvas.getByRole('group', { name: 'Management' }))
    await expect(management.getByText('You')).toBeVisible()
    const invites = within(canvas.getByRole('group', { name: 'Invites' }))
    await expect(invites.getByText('6 days left')).toBeVisible()
    await expect(invites.getByText('They’ll see the invite when they sign in with +993 64 •• •• 90')).toBeVisible()
    await expect(invites.getByText('Expired')).toBeVisible()
    await expect(within(canvas.getByRole('group', { name: 'No longer on the team' })).getByText('Removed')).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Team · Settings · Glow Studio · Ýeral Business'))
  },
}

/** «Copy invite link»: the link comes with a resend (the api keeps only its hash), then it's on the clipboard. */
export const CopyInviteLink: Story = {
  play: async ({ canvas }) => {
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    try {
      await userEvent.click(await canvas.findByRole('button', { name: 'Copy invite link: Gülnar Öwezowa' }))
      const dialog = within(await body.findByRole('dialog', { name: 'Invite link for Gülnar Öwezowa' }))
      await userEvent.click(await dialog.findByRole('button', { name: 'Copy' }))
      await expect(write).toHaveBeenCalledWith('https://business.yeral.localhost/invite/gulnar-token-0123456789')
    } finally {
      write.mockRestore()
    }
  },
}

/** An expired invite is sent again; a removed person is reactivated. */
export const ResendAndReactivate: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Resend invite: Ogul' }))
    const resent = await body.findByText('Invite sent again to Ogul')
    await waitFor(() => expect(resent).toBeVisible())
    await userEvent.click(canvas.getByRole('button', { name: 'Reactivate: Aýna Myradowa' }))
    const back = await body.findByText('Aýna is back on the team')
    await waitFor(() => expect(back).toBeVisible())
  },
}

/** An open invite's menu: Cancel invite, and the person can't accept it any more. */
export const CancelInvite: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Gülnar Öwezowa: actions' }))
    await userEvent.click(await body.findByRole('menuitem', { name: 'Cancel invite' }))
    const toast = await body.findByText('Invite cancelled · Gülnar can’t accept it any more')
    await waitFor(() => expect(toast).toBeVisible())
  },
}

/** The administrator sees the team with a note, and nothing to change here. */
export const Admin: Story = {
  args: { server: fakeApi('admin') },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Only the owner adds and removes people/)).toBeVisible()
    await expect(await canvas.findByText('Maral Ataýewa')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^Copy invite link: / })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Reactivate: / })).toBeNull()
  },
}

/** Under 1024: each row's level, services and hours in one line under the name, the status under it. */
export const Tablet: Story = { globals: { viewport: { value: 'sm' } } }

/** The phone. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
