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
import { PageStory, pickDate } from '@/shared/storybook'
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
  person('ayna', 'Aýna', 'specialist', {
    fullName: 'Aýna Myradowa',
    status: 'removed',
    specialization: 'Hair stylist',
    phone: '+99365990011',
  }),
]
const service = (id: string, name: string, durationMin: number, priceAmount: number, staffIds: string[]) => ({
  id,
  name: { en: name },
  durationMin,
  priceType: 'fixed',
  priceAmount,
  staffIds,
})
const menu = {
  groups: [
    {
      id: 'g1',
      name: { en: 'Nails' },
      services: [service('s1', 'Manicure', 60, 150, ['maral']), service('s2', 'Gel polish', 90, 200, ['maral'])],
    },
    { id: 'g2', name: { en: 'Hair' }, services: [service('s3', 'Women’s haircut', 60, 180, ['jeren'])] },
    { id: 'g3', name: { en: 'Massage' }, services: [service('s4', 'Back massage', 45, 250, ['leyli'])] },
  ],
}
type Schedule = {
  shift: ({ open: number; close: number } | null)[] | null
  breaks: ({ start: number; end: number } | null)[]
  daysOff: { name: string; from: string; to: string; yearly: boolean }[]
}
/** Jeren works her own shift, with time off 9–13 November (demo-data v06r3); the others follow the business hours. */
const scheduleOf = (id: string): Schedule => ({
  shift: id === 'jeren' ? [...Array.from({ length: 6 }, () => ({ open: 720, close: 1140 })), null] : null,
  breaks: Array<null>(7).fill(null),
  daysOff: id === 'jeren' ? [{ name: 'Family trip', from: '2026-11-09', to: '2026-11-13', yearly: false }] : [],
})
/** Glow Studio's week: Monday to Saturday 09:00–20:00, closed on Sunday. */
const businessHours = {
  hours: [...Array.from({ length: 6 }, () => ({ open: 540, close: 1200, break: null })), null],
  specialDays: [],
}

/** The rows the last removal sent: what happens to each booking the colleague can't take. */
let removalRows: { code: string; affected: string }[] | null = null

/** Maral's bookings ahead as a removal lists them: one Leýli can take, one nobody else does. */
const maralAhead = {
  count: 2,
  counts: { bookings: 2, requests: 0 },
  byStaff: [{ staffId: '00000000-0000-4000-8000-000000000003', name: 'Maral', count: 2 }],
  bookings: [
    {
      code: 'YR-48213',
      date: '2026-11-03',
      start: 600,
      end: 660,
      status: 'confirmed',
      holdUntil: null,
      client: 'Gözel A.',
      items: [{ serviceId: null, service: 'Manicure', staffId: null, staff: 'Maral', start: 600, end: 660 }],
      staff: ['Maral'],
      colleagues: [{ staffId: '00000000-0000-4000-8000-000000000005', name: 'Leýli Berdiýewa' }],
    },
    {
      code: 'YR-48214',
      date: '2026-11-04',
      start: 720,
      end: 810,
      status: 'confirmed',
      holdUntil: null,
      client: 'Mähri G.',
      items: [{ serviceId: null, service: 'Gel polish', staffId: null, staff: 'Maral', start: 720, end: 810 }],
      staff: ['Maral'],
      colleagues: [],
    },
  ],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it. */
const fakeApi =
  (level: Workspace['level']): (() => typeof fetch) =>
  () => {
    let people = team
    let staffed = menu
    const schedules = new Map<string, Schedule>()
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      const w = glow(level)
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /w/glow-studio/team') return json({ items: people })
      if (route === 'GET /w/glow-studio/services') return json(staffed)
      if (route === 'GET /w/glow-studio/settings/rules') return json({ requestAnswerers: 'both' })
      if (route === 'GET /w/glow-studio/settings/hours') return json(businessHours)
      // a schedule saved: Maral's bookings on 3 November are asked about when time off takes that day
      const week = /^PUT \/w\/glow-studio\/team\/([^/]+)\/schedule$/.exec(route)
      if (week) {
        const { affected, ...next } = (await request.json()) as Schedule & { affected?: string }
        const hits = week[1] === 'maral' && next.daysOff.some((d) => d.from <= '2026-11-03' && d.to >= '2026-11-03')
        if (hits && !affected) return json({ error: { code: 'bookings_affected', details: maralAhead } }, 409)
        schedules.set(week[1]!, next)
        const settled = hits ? (affected === 'cancel' ? { cancelled: 2, kept: 0 } : { cancelled: 0, kept: 2 }) : { cancelled: 0, kept: 0 }
        return json({ ...next, moved: 0, ...settled })
      }
      // the staff drawer: the profile and access in one change, the services in their own
      const edit = /^PATCH \/w\/glow-studio\/team\/([^/]+)$/.exec(route)
      if (edit) {
        const body = (await request.json()) as Partial<TeamMember> & { specialization?: Record<string, string> | null }
        const { specialization, hasApp, ...rest } = body
        people = people.map((p) =>
          p.id === edit[1]
            ? {
                ...p,
                ...rest,
                ...(specialization !== undefined ? { specialization: specialization?.en ?? null } : {}),
                ...(hasApp === false
                  ? { hasApp: false, status: 'active' as const, invite: p.invite && { ...p.invite, state: 'cancelled' as const } }
                  : {}),
              }
            : p,
        )
        return json(people.find((p) => p.id === edit[1]))
      }
      // removing someone: Maral's bookings ahead are asked about first, then settled as chosen
      const removing = /^POST \/w\/glow-studio\/team\/([^/]+)\/remove$/.exec(route)
      if (removing) {
        const body = (await request.json()) as { affected?: string; rows?: { code: string; affected: string }[] }
        if (removing[1] === 'maral' && !body.affected) return json({ error: { code: 'bookings_affected', details: maralAhead } }, 409)
        removalRows = body.rows ?? null
        people = people.map((p) => (p.id === removing[1] ? { ...p, status: 'removed' as const } : p))
        const cancelled = body.affected === 'cancel' ? 2 : (body.rows ?? []).filter((r) => r.affected === 'cancel').length
        const moved = body.affected === 'move' ? 1 : 0
        return json({ moved, kept: removing[1] === 'maral' ? 2 - moved - cancelled : 0, cancelled })
      }
      const doing = /^PUT \/w\/glow-studio\/team\/([^/]+)\/services$/.exec(route)
      if (doing) {
        const { serviceIds } = (await request.json()) as { serviceIds: string[] }
        const id = doing[1]!
        staffed = {
          groups: staffed.groups.map((g) => ({
            ...g,
            services: g.services.map((sv) => ({
              ...sv,
              staffIds: serviceIds.includes(sv.id) ? [...new Set([...sv.staffIds, id])] : sv.staffIds.filter((x) => x !== id),
            })),
          })),
        }
        return json(people.find((p) => p.id === id))
      }
      // «Add a team member»: an invite, or a specialist without the app, active at once
      if (route === 'POST /w/glow-studio/team/invites' || route === 'POST /w/glow-studio/team/phone-only') {
        const body = (await request.json()) as { phone: string; name: string; level?: 'admin' | 'specialist'; serviceIds?: string[] }
        const app = route.endsWith('/invites')
        const added = person(`new-${people.length}`, body.name, body.level ?? 'specialist', {
          phone: body.phone,
          status: app ? 'invited' : 'active',
          hasApp: app,
          joined: false,
          bookable: (body.serviceIds?.length ?? 0) > 0,
          invite: app ? invite('pending', 7) : null,
        })
        people = [...people, added]
        return app
          ? json({ member: added, link: `https://business.yeral.localhost/invite/${added.id}-token-0123456789` }, 201)
          : json(added, 201)
      }
      const one = /^(GET|POST|DELETE) \/w\/glow-studio\/team\/([^/]+)\/(schedule|invite|reactivate)$/.exec(route)
      if (one) {
        const [, method, id, what] = one
        const m = people.find((p) => p.id === id)!
        if (what === 'schedule') return json(schedules.get(id!) ?? scheduleOf(id!))
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

const openAdd = async (canvas: typeof body) => {
  await userEvent.click(await canvas.findByRole('button', { name: 'Add a team member' }))
  return within(await body.findByRole('dialog', { name: 'Add a team member' }))
}

/** «Add a team member»: who, then the services (a group's «All»), then the review, and the invite's link in the toast. */
export const AddMember: Story = {
  play: async ({ canvas }) => {
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    try {
      const dialog = await openAdd(canvas)
      const next = dialog.getByRole('button', { name: 'Continue' })
      await expect(next).toBeDisabled()
      await userEvent.type(dialog.getByLabelText('Mobile number'), '65334455')
      await userEvent.type(dialog.getByLabelText('Name clients see'), 'Gülşat')
      await userEvent.type(dialog.getByLabelText(/^Specialization/), 'Nail artist')
      await userEvent.type(dialog.getByLabelText(/^Full name/), 'Gülşat Annaýewa')
      await expect(dialog.getByText('They’ll see the invite when they sign in with +993 65 •• •• 55 · valid 7 days')).toBeVisible()
      await userEvent.click(next)

      await expect(await dialog.findByRole('heading', { name: 'What does Gülşat do?' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Continue' })).toBeDisabled()
      await userEvent.click(dialog.getByRole('checkbox', { name: 'Nails: all' }))
      await expect(dialog.getByRole('checkbox', { name: /Manicure/ })).toBeChecked()
      await expect(dialog.getByText('2 / 2')).toBeVisible()
      await expect(dialog.getByText('2 services selected')).toBeVisible()
      await userEvent.click(dialog.getByRole('checkbox', { name: /Gel polish/ }))
      // one of the group: «All» reads as mixed
      await expect(dialog.getByRole('checkbox', { name: 'Nails: all' })).toHaveProperty('indeterminate', true)
      await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))

      await expect(await dialog.findByRole('button', { name: 'Services: 1: Manicure. Change' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Mobile number: +993 65 33 44 55. Change' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Full name: Gülşat Annaýewa. Change' })).toBeVisible()
      await expect(dialog.getByText(/It works for 7 days — until/)).toBeVisible()
      await userEvent.click(dialog.getByRole('button', { name: 'Send invite' }))

      const sent = await body.findByText(/^Invite sent to Gülşat · valid until/)
      await waitFor(() => expect(sent).toBeVisible())
      await expect(body.queryByRole('dialog', { name: 'Add a team member' })).toBeNull()
      await expect(await within(canvas.getByRole('group', { name: 'Invites' })).findByText('Gülşat')).toBeVisible()
      await userEvent.click(within(sent.closest<HTMLElement>('[data-sonner-toast]')!).getByRole('button', { name: 'Copy invite link' }))
      const link = within(await body.findByRole('dialog', { name: 'Invite link for Gülşat' }))
      await userEvent.click(await link.findByRole('button', { name: 'Copy' }))
      await expect(write).toHaveBeenCalledWith(expect.stringMatching(/\/invite\/new-\d+-token-/))
    } finally {
      write.mockRestore()
    }
  },
}

/** «Uses the app» off: bookable at once and never signs in, so the last step adds them instead of inviting. */
export const AddWithoutApp: Story = {
  play: async ({ canvas }) => {
    const dialog = await openAdd(canvas)
    await userEvent.type(dialog.getByLabelText('Mobile number'), '65778899')
    await userEvent.type(dialog.getByLabelText('Name clients see'), 'Ogulgerek')
    await userEvent.click(dialog.getByRole('switch', { name: 'Uses the app' }))
    await expect(dialog.getByText(/^Bookable at once, never signs in/)).toBeVisible()
    await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))
    await userEvent.click(await dialog.findByRole('checkbox', { name: /Back massage/ }))
    await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))
    await expect(await dialog.findByRole('button', { name: 'Uses the app: No. Change' })).toBeVisible()
    await expect(
      dialog.getByText('Ogulgerek can be booked at once and never signs in. You and the admins handle their requests.'),
    ).toBeVisible()
    await userEvent.click(dialog.getByRole('button', { name: 'Add to the team' }))
    const added = await body.findByText('Ogulgerek added to the team · clients can book Ogulgerek now')
    await waitFor(() => expect(added).toBeVisible())
  },
}

/** A number that can't be added says why: not a mobile one, on the team, an open or ended invite, someone removed. */
export const AddProblems: Story = {
  play: async ({ canvas }) => {
    const dialog = await openAdd(canvas)
    const phone = dialog.getByLabelText('Mobile number')
    const says = async (digits: string, text: string) => {
      await userEvent.clear(phone)
      await userEvent.type(phone, digits)
      await expect(await dialog.findByText(text)).toBeVisible()
      await expect(phone).toHaveAttribute('aria-invalid', 'true')
    }
    await userEvent.type(dialog.getByLabelText('Name clients see'), 'Aýna')
    await says('12345678', 'Mobile numbers only — enter a number starting with 6 or 7.')
    await says('65884102', 'This person is already on the team.')
    await says('64551290', 'There’s already an open invite for this number.')
    await says('61223344', 'This number has an earlier invite. Resend it from its row in Team.')
    await says('65000000', 'This person is already on the team.')
    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeDisabled()
    // someone no longer on the team: invited again with the app, reactivated from their row without it
    await userEvent.clear(phone)
    await userEvent.type(phone, '65990011')
    await expect(phone).not.toHaveAttribute('aria-invalid')
    await userEvent.click(dialog.getByRole('switch', { name: 'Uses the app' }))
    await expect(await dialog.findByText('This person was removed from the team — reactivate them in Team instead.')).toBeVisible()
    // an administrator always uses the app: no switch, the note says so
    await userEvent.selectOptions(dialog.getByLabelText('Access level'), 'admin')
    await expect(dialog.queryByRole('switch', { name: 'Uses the app' })).toBeNull()
    await expect(dialog.getByText('Manages the whole calendar and all clients; doesn’t see revenue.')).toBeVisible()
  },
}

/** The window on a phone; closing it puts the focus back on «Add a team member». */
export const AddMemberPhone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const dialog = await openAdd(canvas)
    await expect(dialog.getByLabelText('Mobile number')).toBeVisible()
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Add a team member' })).toHaveFocus())
  },
}

/** A row opens the staff drawer: the profile, saved with one Save. */
export const DrawerProfile: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Maral Ataýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Maral Ataýewa' }))
    await expect(drawer.getByText('Nail artist · Specialist')).toBeVisible()
    const save = drawer.getByRole('button', { name: 'Save' })
    await expect(save).toBeDisabled()
    const spec = drawer.getByLabelText(/^Specialization/)
    await userEvent.clear(spec)
    await userEvent.type(spec, 'Nail technician')
    await expect(drawer.getByText('Maral · Nail technician')).toBeVisible()
    // someone with the app signs in with their number: it's theirs to change
    await expect(drawer.getByLabelText('Phone number')).toHaveAttribute('readonly')
    await userEvent.click(save)
    const saved = await body.findByText('Maral: changes saved')
    await waitFor(() => expect(saved).toBeVisible())
    await expect(body.queryByRole('dialog', { name: 'Maral Ataýewa' })).toBeNull()
  },
}

/** A specialist without the app with an invite waiting: the number is the invite's; turning the app off cancels it. */
export const DrawerNoApp: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Leýli Berdiýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Leýli Berdiýewa' }))
    // the invite went to this number: it stays as it is while the invite waits (B-Team)
    await expect(drawer.getByLabelText('Phone number')).toHaveAttribute('readonly')
    await expect(drawer.getByText('The invite is for this number.')).toBeVisible()
    await userEvent.click(drawer.getByRole('tab', { name: 'Access level' }))
    await expect(await drawer.findByText('The invite is waiting for Leýli. Turn this off to cancel it.')).toBeVisible()
    await expect(drawer.getByText(/^They’ll see the invite when they sign in with \+993 65 •• •• 22 · until/)).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Copy invite link' })).toBeVisible()
    // an administrator always uses the app: Leýli can become one once she does
    await expect(drawer.getByRole('option', { name: 'Admin' })).toBeDisabled()
    await userEvent.click(drawer.getByRole('switch', { name: 'Uses the app' }))
    await expect(drawer.getByText('Saving cancels the invite. Leýli keeps working without the app.')).toBeVisible()
    await expect(drawer.getByText(/Leýli’s requests go to you and the admins/)).toBeVisible()
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }))
    const done = await body.findByText('Invite cancelled · Leýli keeps working without the app')
    await waitFor(() => expect(done).toBeVisible())
  },
}

/** The services someone does, with a group's «All»; the count on Team follows. */
export const DrawerServices: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Jeren Hojaýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Jeren Hojaýewa' }))
    await userEvent.click(drawer.getByRole('tab', { name: 'Services' }))
    await expect(await drawer.findByText('What does Jeren do?')).toBeVisible()
    await expect(drawer.getByRole('checkbox', { name: /Women’s haircut/ })).toBeChecked()
    await userEvent.click(drawer.getByRole('checkbox', { name: 'Nails: all' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }))
    const saved = await body.findByText('Jeren: changes saved')
    await waitFor(() => expect(saved).toBeVisible())
    const specialists = within(canvas.getByRole('group', { name: 'Specialists' }))
    await expect(await specialists.findByText('3 services')).toBeVisible()
  },
}

/** The owner's own row: the profile, and an access level nobody changes. */
export const DrawerOwner: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Maýsa Annaýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Maýsa Annaýewa' }))
    await expect(drawer.getByText('You · Owner')).toBeVisible()
    await userEvent.click(drawer.getByRole('tab', { name: 'Access level' }))
    await expect(await drawer.findByText(/^Owner — every permission, including the team/)).toBeVisible()
    await expect(drawer.queryByRole('switch')).toBeNull()
    // the owner can't be removed
    await expect(drawer.queryByRole('button', { name: 'Remove from the team' })).toBeNull()
  },
}

/** The administrator: everything to read, the services to change. */
export const DrawerAdmin: Story = {
  args: { server: fakeApi('admin') },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Leýli Berdiýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Leýli Berdiýewa' }))
    await expect(drawer.getByText('Only the owner changes names, phone numbers and access levels.')).toBeVisible()
    await expect(drawer.getByLabelText('Name clients see')).toBeDisabled()
    await expect(drawer.queryByRole('button', { name: 'Save' })).toBeNull()
    await expect(drawer.queryByRole('button', { name: 'Remove from the team' })).toBeNull()
    await userEvent.click(drawer.getByRole('tab', { name: 'Hours' }))
    await expect(await drawer.findByText('Only the owner changes shifts and time off.')).toBeVisible()
    await expect(drawer.queryByRole('button', { name: 'Add time off' })).toBeNull()
    await userEvent.click(drawer.getByRole('tab', { name: 'Services' }))
    await userEvent.click(await drawer.findByRole('checkbox', { name: /Manicure/ }))
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }))
    const saved = await body.findByText('Leýli: changes saved')
    await waitFor(() => expect(saved).toBeVisible())
  },
}

/** Remove someone with bookings ahead: moved to a colleague who does the service, the one nobody else does cancelled. */
export const RemoveWithBookings: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Maral Ataýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Maral Ataýewa' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Remove from the team' }))
    const modal = within(await body.findByRole('dialog', { name: 'Remove Maral from the team?' }))
    // the window may still be coming in
    await waitFor(() => expect(modal.getByText(/^Maral loses access to Glow Studio/)).toBeVisible())
    await userEvent.click(modal.getByRole('button', { name: 'Remove Maral' }))
    // the api lists the bookings ahead: moving is picked, to the colleague who does manicures
    await expect(await modal.findByRole('radio', { name: 'Move to another specialist' })).toBeChecked()
    await expect(modal.getByRole('combobox', { name: 'To' })).toHaveDisplayValue('Leýli Berdiýewa')
    await expect(modal.getByText('2 bookings')).toBeVisible()
    await expect(modal.getByText('Nobody else does Gel polish')).toBeVisible()
    await expect(modal.getByText('Moves to Leýli Berdiýewa')).toBeVisible()
    await userEvent.selectOptions(modal.getByRole('combobox', { name: /^Mähri G\., .*: what happens$/ }), 'cancel')
    await userEvent.click(modal.getByRole('button', { name: 'Remove Maral' }))
    const done = await body.findByText(
      'Maral removed from the team · 1 moved to Leýli Berdiýewa, 1 cancelled with 3 other times offered · the clients are notified',
    )
    await waitFor(() => expect(done).toBeVisible())
    // every row goes with what happens if Leýli can't take it then: Keep it unless changed
    await expect(removalRows).toEqual([
      { code: 'YR-48213', affected: 'keep' },
      { code: 'YR-48214', affected: 'cancel' },
    ])
    await expect(body.queryByRole('dialog', { name: 'Maral Ataýewa' })).toBeNull()
    // the removed person's row has no drawer: the focus goes to «Add a team member»
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Add a team member' })).toHaveFocus())
  },
}

/** Keep them: the bookings stay as they are, no new ones for Maral. */
export const RemoveKeep: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Maral Ataýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Maral Ataýewa' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Remove from the team' }))
    const modal = within(await body.findByRole('dialog', { name: 'Remove Maral from the team?' }))
    await userEvent.click(modal.getByRole('button', { name: 'Remove Maral' }))
    await userEvent.click(await modal.findByRole('radio', { name: 'Keep them' }))
    await expect(modal.getByText('They stay in the calendar as they are. No new bookings for Maral.')).toBeVisible()
    await expect(modal.queryByRole('combobox', { name: 'To' })).toBeNull()
    await userEvent.click(modal.getByRole('button', { name: 'Remove Maral' }))
    const done = await body.findByText('Maral removed from the team · 2 kept as they are')
    await waitFor(() => expect(done).toBeVisible())
  },
}

/** Remove someone with nothing ahead: gone at once. */
export const RemoveNothingAhead: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Jeren Hojaýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Jeren Hojaýewa' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Remove from the team' }))
    const modal = within(await body.findByRole('dialog', { name: 'Remove Jeren from the team?' }))
    await userEvent.click(modal.getByRole('button', { name: 'Remove Jeren' }))
    const done = await body.findByText('Jeren removed from the team')
    await waitFor(() => expect(done).toBeVisible())
    await expect(await within(canvas.getByRole('group', { name: 'No longer on the team' })).findByText('Jeren Hojaýewa')).toBeVisible()
  },
}

/** Hours: Jeren's own shift changed and a break added, saved with the drawer; her time off listed. */
export const DrawerHours: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Jeren Hojaýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Jeren Hojaýewa' }))
    await userEvent.click(drawer.getByRole('tab', { name: 'Hours' }))
    await expect(await drawer.findByRole('radio', { name: /^Own shift/ })).toBeChecked()
    await expect(drawer.getByText('9–13 November 2026')).toBeVisible()
    await expect(drawer.getByText('5 days · Family trip')).toBeVisible()
    // Sunday the business is closed: no shift opens it
    await expect(drawer.getByRole('switch', { name: 'Sunday: works' })).toBeDisabled()
    await userEvent.selectOptions(drawer.getByRole('combobox', { name: 'Monday: ends' }), '20:00')
    await userEvent.click(drawer.getByRole('button', { name: 'Monday: add a break' }))
    await expect(drawer.getByRole('combobox', { name: 'Monday: break starts' })).toBeVisible()
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }))
    const saved = await body.findByText('Jeren’s shift saved')
    await waitFor(() => expect(saved).toBeVisible())
  },
}

/** Time off over bookings: asked first, the bookings cancelled with other times offered; added at once. */
export const DrawerTimeOff: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Maral Ataýewa' }))
    const drawer = within(await body.findByRole('dialog', { name: 'Maral Ataýewa' }))
    await userEvent.click(drawer.getByRole('tab', { name: 'Hours' }))
    await expect(await drawer.findByText('No time off planned.')).toBeVisible()
    await userEvent.click(drawer.getByRole('button', { name: 'Add time off' }))
    await pickDate(drawer, 'From', '2026-11-03')
    await userEvent.type(drawer.getByLabelText(/^Note/), 'Wedding')
    await userEvent.click(within(drawer.getByRole('group', { name: 'Add time off' })).getByRole('button', { name: 'Add time off' }))
    const modal = within(await body.findByRole('dialog', { name: 'Maral has 2 bookings during this time off' }))
    await userEvent.click(modal.getByRole('radio', { name: /^Cancel and offer 3 other times/ }))
    await userEvent.click(modal.getByRole('button', { name: 'Add time off' }))
    const added = await body.findByText(/^Time off added: 3 November 2026 · 2 bookings cancelled/)
    await waitFor(() => expect(added).toBeVisible())
    await expect(await drawer.findByText('1 day · Wedding')).toBeVisible()
  },
}

/** The drawer on a phone: a sheet from the bottom. */
export const DrawerPhone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Maral Ataýewa' }))
    await expect(await body.findByRole('dialog', { name: 'Maral Ataýewa' })).toBeVisible()
  },
}

/** The administrator sees the team with a note, and nothing to change here. */
export const Admin: Story = {
  args: { server: fakeApi('admin') },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Only the owner adds and removes people/)).toBeVisible()
    await expect(await canvas.findByText('Maral Ataýewa')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Add a team member' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Copy invite link: / })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Reactivate: / })).toBeNull()
  },
}

/** Under 1024: each row's level, services and hours in one line under the name, the status under it. */
export const Tablet: Story = { globals: { viewport: { value: 'sm' } } }

/** The phone. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
