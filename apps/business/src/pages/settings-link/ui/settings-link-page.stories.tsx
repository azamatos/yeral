/**
 * Settings → Link and QR — B-Settings `pane=link` (v0.6 round 3, English), in the app's shell and Settings' frame over
 * a `fetch` that answers like the api: the menu beside the section from 1024 and a chip row under 1024; where the page
 * stands (live, in review, sent back, hidden by Ýeral); the page link with Copy and Share; the QR code with its
 * downloads. Sections not built yet open as their header in the frame.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsLinkPage } from './settings-link-page'

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

const glow = (status: Workspace['status'], statusReason: string | null = null): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: '247 Bitarap Türkmenistan Avenue',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level: 'owner',
  status,
  statusReason,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt: 1,
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Each `PUT …/settings/page-address` as `from → to`. */
const moves: string[] = []

/**
 * The api as the shell and this section ask it: the page address check (glow-taken is another business's, support a
 * reserved word) and a move, after which the workspace has its new address.
 */
const fakeApi =
  (workspace: Workspace): (() => typeof fetch) =>
  () => {
    let current = workspace
    moves.length = 0
    // glow-race: free when checked, taken by another business at the save
    let raced = false
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [current], current: current.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /page-address') {
        const slug = url.searchParams.get('slug') ?? ''
        const problem = slug === 'glow-taken' || (slug === 'glow-race' && raced) ? 'taken' : slug === 'support' ? 'reserved' : null
        return json({ slug, problem, suggestion: problem ? `${slug}-2` : null })
      }
      if (route === `PUT /w/${current.slug}/settings/page-address`) {
        const { slug } = (await request.json()) as { slug: string }
        if (slug === 'glow-race') {
          raced = true
          return json({ error: { code: 'validation_error', details: { issues: [{ path: ['slug'], code: 'taken' }] } } }, 400)
        }
        moves.push(`${current.slug} → ${slug}`)
        current = { ...current, slug }
        return json({ slug })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

const layouts = {
  '/w/$slug': {
    component: WorkspaceShell,
    children: {
      settings: {
        component: SettingsLayoutPage,
        children: {
          profile: () => <SettingsPlaceholder section="profile" />,
          rules: () => <SettingsPlaceholder section="rules" />,
          hours: () => <SettingsPlaceholder section="hours" />,
          services: () => <SettingsPlaceholder section="services" />,
          team: () => <SettingsPlaceholder section="team" />,
          permissions: () => <SettingsPlaceholder section="permissions" />,
          link: SettingsLinkPage,
        },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/LinkAndQR',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/link', server: fakeApi(glow('live')) },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** A live page: the menu beside the section, the link with Copy and Share, the QR code with its downloads. */
export const Live: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Link and QR' })).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
    const nav = canvas.getByRole('navigation', { name: 'Settings sections' })
    await expect(nav).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Link and QR' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByText('Your page shows in search and opens at your link.')).toBeVisible()
    // the link as people read it: the client site's host, no language
    await expect(canvas.getByRole<HTMLInputElement>('textbox', { name: 'Your page link' }).value).toMatch(/\/b\/glow-studio$/)
    await expect(canvas.getByRole('button', { name: 'Copy' })).toBeVisible()
    await expect(canvas.getByRole('img', { name: 'QR code for Glow Studio’s page' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Download SVG' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Link and QR · Settings · Glow Studio · Ýeral Business'))
  },
}

/**
 * Another section from the menu: it opens in the frame (its header until slice 2 builds it), the menu stays, and the
 * section's name takes the focus (not «Settings» again).
 */
export const OtherSection: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'Hours' }))
    const title = await canvas.findByRole('heading', { level: 2, name: 'Hours' })
    await expect(title).toBeVisible()
    await waitFor(() => expect(title).toHaveFocus())
    await expect(canvas.getByRole('link', { name: 'Hours' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Link and QR' })).not.toHaveAttribute('aria-current')
  },
}

/** In review: only the team sees the page until Ýeral's check. */
export const InReview: Story = {
  args: { server: fakeApi(glow('in_review')) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('In review')).toBeVisible()
  },
}

/** Sent back by the Ýeral team: their reason and «Fix and send again» in the business profile. */
export const NotApproved: Story = {
  args: { server: fakeApi(glow('not_approved', 'The photos show another business. Add photos of your own place.')) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The photos show another business. Add photos of your own place.')).toBeVisible()
    await userEvent.click(canvas.getByRole('link', { name: 'Fix and send again' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Business profile' })).toBeVisible()
  },
}

/** Hidden by Ýeral: the reason, what clients can't do, and Contact Ýeral. */
export const Hidden: Story = {
  args: { server: fakeApi(glow('hidden', 'Several clients reported that the address is wrong.')) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Hidden by Ýeral')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Contact Ýeral' })).toBeVisible()
  },
}

/**
 * «Change link»: the address checked as it's typed (lower case, hyphens; a taken one offers a free one like it), the
 * note that old links and QR codes keep working; Save moves the workspace's pages to the new address. Escape leaves it.
 */
export const ChangeLink: Story = {
  name: 'Change link',
  play: async ({ canvas }) => {
    const change = await canvas.findByRole('button', { name: 'Change link' })
    await userEvent.click(change)
    const box = canvas.getByRole('textbox', { name: 'New link' })
    await waitFor(() => expect(box).toHaveFocus())
    await expect(box).toHaveValue('glow-studio')
    await expect(canvas.getByText('Old links and printed QR codes keep working: they open your page at its new address.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Save link' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.queryByRole('textbox', { name: 'New link' })).toBeNull())
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Change link' })).toHaveFocus())

    await userEvent.click(canvas.getByRole('button', { name: 'Change link' }))
    const field = canvas.getByRole('textbox', { name: 'New link' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Glow Taken')
    await expect(field).toHaveValue('glow-taken')
    await expect(await canvas.findByText('Another business has this address.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Save link' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: 'Use glow-taken-2' }))
    await expect(field).toHaveValue('glow-taken-2')
    await expect(await canvas.findByText('This address is free.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Save link' }))
    await waitFor(() => expect(moves).toEqual(['glow-studio → glow-taken-2']))
    await expect(await within(document.body).findByText(/Your page’s link is now .*\/b\/glow-taken-2/)).toBeInTheDocument()
    // the workspace's pages at the new address: its link shows it
    await waitFor(() =>
      expect(canvas.getByRole<HTMLInputElement>('textbox', { name: 'Your page link' }).value).toMatch(/\/b\/glow-taken-2$/),
    )
  },
}

/** Another business takes the address between the check and Save: said so, and the check offers a free one. */
export const TakenMeanwhile: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change link' }))
    const field = canvas.getByRole('textbox', { name: 'New link' })
    await userEvent.clear(field)
    await userEvent.type(field, 'glow-race')
    await expect(await canvas.findByText('This address is free.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Save link' }))
    // the toast says it, and the field's check, asked again, offers a free one
    await expect(await canvas.findByRole('button', { name: 'Use glow-race-2' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Save link' })).toBeDisabled()
    await expect(within(document.body).getAllByText('Another business has this address.').length).toBeGreaterThanOrEqual(2)
    await expect(moves).toEqual([])
  },
}

/** The shared demo workspace keeps its address: no «Change link». */
export const Demo: Story = {
  args: { server: fakeApi(glow('demo')) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Your page link' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Change link' })).toBeNull()
  },
}

/** 1024: the menu still beside the section, next to the shell's sidebar. */
export const Laptop: Story = { globals: { viewport: { value: 'md' } } }

/** Under 1024: the menu is a chip row above the section that scrolls sideways. */
export const Tablet: Story = {
  globals: { viewport: { value: 'sm' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'Link and QR' })).toHaveAttribute('aria-current', 'page')
  },
}

/** The phone: the chip row 16 from the edges, the QR card under the link. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
