/**
 * Settings → Business profile — B-Settings `isProfile` (v0.6 round 3, English), in the app's shell and Settings' frame
 * over a `fetch` that answers like the api: the main details with the logo, the About, the phone and the amenities,
 * «Pause online booking» and, for the owner, «Close this workspace»; the save bar while there are changes; the Ýeral
 * team's reason when the page was sent back; the photos; the address with its map.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { BusinessProfile } from '@yeral/contract/settings'
import type { Workspace } from '@yeral/contract/team'
import { DEFAULT_RULES } from '@yeral/domain/rules'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { LAUNCH_CATEGORIES, PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsProfilePage } from './settings-profile-page'

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

const PROFILE: BusinessProfile = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  logo: null,
  categoryId: 'beauty',
  about: { en: 'Haircuts, colouring and nails in the centre of Ashgabat.' },
  phone: '+99312345678',
  amenities: ['wifi', 'parking'],
  womenOnly: false,
  location: {
    lat: 37.95,
    lng: 58.38,
    cityId: 'ashgabat',
    address: '247 Bitarap Türkmenistan Avenue',
    street: 'Bitarap Türkmenistan Avenue',
  },
  floor: null,
  entranceNote: null,
  hideExactAddress: false,
  verification: 'verified',
  verificationReason: null,
  hidden: null,
}

const CITIES = {
  items: [
    { id: 'ashgabat', name: 'Ashgabat', lat: 37.9601, lng: 58.3261 },
    { id: 'mary', name: 'Mary', lat: 37.6005, lng: 61.8302 },
  ],
  main: 'ashgabat',
}

const sent: { profile: unknown[]; rules: unknown[]; review: number; logo: number[][]; order: string[][]; removed: string[] } = {
  profile: [],
  rules: [],
  review: 0,
  logo: [],
  order: [],
  removed: [],
}

/**
 * An upload's end: the picture is decoded and drawn in the browser, sent, and the settings are asked again before the
 * page says so, which on a busy CI runner takes longer than a query's default second.
 */
const UPLOAD = { timeout: 10_000 }

// flat squares in the brand's tints: no network in the stories
const square = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="${fill}"/></svg>`)}`
const GALLERY = [
  { id: 'hall', url: square('#d5cbfb'), alt: 'Salon hall' },
  { id: 'chair', url: square('#bfe6d1'), alt: 'Styling chair' },
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it, with its own copy of the profile and the rules. */
const fakeApi =
  ({
    level = 'owner',
    profile: start = {},
  }: { level?: Workspace['level']; profile?: Partial<BusinessProfile> } = {}): (() => typeof fetch) =>
  () => {
    let profile: BusinessProfile = { ...PROFILE, ...start }
    let rules = { ...DEFAULT_RULES, lateMinutes: 15 }
    let gallery = [...GALLERY]
    sent.profile = []
    sent.rules = []
    sent.review = 0
    sent.logo = []
    sent.order = []
    sent.removed = []
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      const body = (request.method === 'PATCH' ? await request.json() : {}) as Record<string, unknown>
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [glow(level)], current: 'glow-studio' })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /categories')
        return json({
          items: LAUNCH_CATEGORIES.map((c) => ({
            ...c,
            icon: 'store',
            bookingTypes: ['appointment'],
            specialistWord: '',
            intro: '',
            starterGroups: [],
          })),
        })
      if (route === 'GET /w/glow-studio/settings/profile') return json(profile)
      if (route === 'GET /cities') return json(CITIES)
      if (route === 'PATCH /w/glow-studio/settings/profile') {
        sent.profile.push(body)
        const phone = typeof body.phone === 'string' ? `+993${body.phone}` : profile.phone
        profile = { ...profile, ...body, phone, about: { ...profile.about, ...(body.about as object | undefined) } }
        return json(profile)
      }
      if (route === 'GET /w/glow-studio/settings/rules') return json(rules)
      if (route === 'PATCH /w/glow-studio/settings/rules') {
        sent.rules.push(body)
        rules = { ...rules, ...body }
        return json(rules)
      }
      if (route === 'PUT /w/glow-studio/settings/logo') {
        const file = (await request.formData()).get('file') as File
        sent.logo.push(await createImageBitmap(file).then((b) => [b.width, b.height]))
        profile = { ...profile, logo: { url: URL.createObjectURL(file), alt: 'Glow Studio' } }
        return json({ logo: profile.logo })
      }
      if (route === 'GET /w/glow-studio/settings/photos') return json({ items: gallery })
      if (route === 'POST /w/glow-studio/settings/photos') {
        const file = (await request.formData()).get('file') as File
        gallery = [...gallery, { id: `p${gallery.length + 1}`, url: URL.createObjectURL(file), alt: '' }]
        return json({ items: gallery })
      }
      if (route === 'PUT /w/glow-studio/settings/photos/order') {
        const { ids } = (await request.json()) as { ids: string[] }
        sent.order.push(ids)
        gallery = ids.flatMap((id) => gallery.find((g) => g.id === id) ?? [])
        return json({ items: gallery })
      }
      const removed = /^DELETE \/w\/glow-studio\/settings\/photos\/([^/]+)$/.exec(route)
      if (removed?.[1]) {
        sent.removed.push(removed[1])
        gallery = gallery.filter((g) => g.id !== removed[1])
        return new Response(null, { status: 204 })
      }
      if (route === 'POST /w/glow-studio/verification') {
        sent.review += 1
        profile = { ...profile, verification: 'pending', verificationReason: null }
        return new Response(null, { status: 204 })
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
        children: { profile: SettingsProfilePage, rules: () => <SettingsPlaceholder section="rules" /> },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/BusinessProfile',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/profile', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The owner's profile as saved: no save bar; «View your page» opens the public page in a new tab. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Business name' })).toHaveValue('Glow Studio')
    await expect(canvas.getByRole('heading', { level: 2, name: 'Business profile' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: /View your page/ })).toHaveAttribute('target', '_blank')
    await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Beauty'))
    await expect(canvas.getByRole('textbox', { name: 'About your business' })).toHaveValue(PROFILE.about.en)
    await expect(canvas.getByRole('checkbox', { name: 'Wi-Fi' })).toBeChecked()
    await expect(canvas.getByRole('checkbox', { name: 'Air conditioning' })).not.toBeChecked()
    await expect(canvas.getByRole('switch', { name: 'Pause online booking' })).not.toBeChecked()
    await expect(canvas.getByRole('heading', { level: 3, name: 'Pause or close' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Add logo' })).toBeVisible()
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
  },
}

/** A change shows the save bar; Save sends only what changed, the pause to the rules, and says «Saved». */
export const Save: Story = {
  play: async ({ canvas }) => {
    const name = await canvas.findByRole('textbox', { name: 'Business name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Glow Nails')
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Air conditioning' }))
    await userEvent.click(canvas.getByRole('switch', { name: 'Pause online booking' }))
    await expect(canvas.getByText(/Online booking is paused/)).toBeVisible()
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull())
    await expect(sent.profile).toEqual([{ name: 'Glow Nails', amenities: ['wifi', 'air_conditioning', 'parking'] }])
    await expect(sent.rules).toEqual([{ onlineEnabled: false }])
    const saved = await within(document.body).findByText('Saved')
    await waitFor(() => expect(saved).toBeVisible())
  },
}

/** Discard puts back what's saved; an empty name and a too-long About block the save. */
export const Problems: Story = {
  play: async ({ canvas }) => {
    const name = await canvas.findByRole('textbox', { name: 'Business name' })
    await userEvent.clear(name)
    await expect(canvas.getByText('Enter the business name.')).toBeVisible()
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await expect(within(bar).getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.click(within(bar).getByRole('button', { name: 'Discard' }))
    await expect(name).toHaveValue('Glow Studio')
    const about = canvas.getByRole('textbox', { name: 'About your business' })
    await userEvent.clear(about)
    await userEvent.click(about)
    await userEvent.paste('x'.repeat(1001))
    await expect(canvas.getByText('Too long: up to 1,000 characters.')).toBeVisible()
    await expect(canvas.getByText('1,001 / 1,000')).toBeVisible()
  },
}

/** A PNG of the size given, drawn in the browser: what someone picks as the logo. */
async function picture(width: number, height: number): Promise<File> {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#5a3ff0'
  ctx.fillRect(0, 0, width, height)
  return new File([await canvas.convertToBlob({ type: 'image/png' })], 'logo.png', { type: 'image/png' })
}

/** A logo saves at once: cropped to the square in its middle, «Logo saved», and «Change logo» from then on. */
export const Logo: Story = {
  play: async ({ canvas }) => {
    await userEvent.upload(await canvas.findByLabelText('Logo'), await picture(600, 400))
    // the upload's end: the api got the square, the row offers «Change logo», then the toast
    await waitFor(() => expect(sent.logo).toEqual([[400, 400]]), UPLOAD)
    await expect(await canvas.findByRole('button', { name: 'Change logo' }, UPLOAD)).toBeVisible()
    const saved = await within(document.body).findByText('Logo saved', {}, UPLOAD)
    await waitFor(() => expect(saved).toBeVisible())
  },
}

/** A picture under 400 × 400 px isn't sent: the row says why. */
export const LogoTooSmall: Story = {
  play: async ({ canvas }) => {
    await userEvent.upload(await canvas.findByLabelText('Logo'), await picture(300, 300))
    await expect(await canvas.findByText('logo.png is 300 × 300 px — the logo needs at least 400 × 400 px.', {}, UPLOAD)).toBeVisible()
    await expect(sent.logo).toEqual([])
  },
}

/**
 * The photos save at once: «Make cover» sends the new order, remove takes one out, a picked PNG is added; under 3 the
 * hint says more get seen more.
 */
export const Photos: Story = {
  play: async ({ canvas }) => {
    const section = await canvas.findByRole('region', { name: 'Photos' })
    await expect(await within(section).findByText('2 of 20')).toBeVisible()
    await expect(within(section).getByText(/Add 1 more photo/)).toBeVisible()
    await userEvent.click(within(section).getByRole('button', { name: 'Make cover: Photo 2' }))
    await waitFor(() => expect(sent.order).toEqual([['chair', 'hall']]))
    // named by their place: the api names every photo after the business
    await expect(within(section).getByRole('button', { name: 'Make cover: Photo 2' })).toBeVisible()
    await userEvent.upload(within(section).getByLabelText('Add photo'), await picture(800, 600))
    await expect(await within(section).findByText('3 of 20', {}, UPLOAD)).toBeVisible()
    await expect(within(section).queryByText(/more photo/)).toBeNull()
    await userEvent.click(within(section).getByRole('button', { name: 'Remove photo: Photo 2' }))
    await expect(await within(section).findByText('2 of 20')).toBeVisible()
    await expect(sent.removed).toEqual(['hall'])
  },
}

/** A file that isn't a photo isn't sent: a dashed tile and why, until it's dismissed. */
export const PhotoRefused: Story = {
  play: async ({ canvas }) => {
    const section = await canvas.findByRole('region', { name: 'Photos' })
    const input = await within(section).findByLabelText('Add photo')
    await userEvent.upload(input, new File(['%PDF-1.7'], 'price-list.pdf', { type: 'image/png' }), { applyAccept: false })
    await expect(await within(section).findByText('price-list.pdf isn’t a photo. Use JPG, PNG or WebP.', {}, UPLOAD)).toBeVisible()
    await userEvent.click(within(section).getByRole('button', { name: 'Dismiss price-list.pdf' }))
    await expect(within(section).queryByText('Not a photo')).toBeNull()
  },
}

/**
 * The address: the wizard's fields with the map; «I work from home» joins the save bar and goes to the profile with the
 * rest of the location as it is.
 */
export const Address: Story = {
  play: async ({ canvas }) => {
    const section = await canvas.findByRole('region', { name: 'Address' })
    await expect(within(section).getByRole('combobox', { name: 'Address' })).toHaveValue(PROFILE.location.address)
    await expect(within(section).getByText(/Moved\?/)).toBeVisible()
    await expect(within(section).getByRole('link', { name: 'Create a business' })).toBeVisible()
    await userEvent.click(within(section).getByRole('switch', { name: 'I work from home' }))
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull())
    await expect(sent.profile).toEqual([expect.objectContaining({ hideExactAddress: true, location: PROFILE.location })])
  },
}

/** Sent back by the Ýeral team: their reason and «Send again». */
export const SentBack: Story = {
  args: { server: fakeApi({ profile: { verification: 'rejected', verificationReason: 'The photos show another business.' } }) },
  play: async ({ canvas }) => {
    const box = await canvas.findByRole('region', { name: 'Your page wasn’t approved' })
    await expect(within(box).getByText('The photos show another business.')).toBeVisible()
    await userEvent.click(within(box).getByRole('button', { name: 'Send again' }))
    const sentToast = await within(document.body).findByText('Sent again — your page is in review')
    await waitFor(() => expect(sentToast).toBeVisible())
    await expect(sent.review).toBe(1)
  },
}

/** An admin reads the reason too; only the owner sends the page again. Unsaved fixes keep «Send again» waiting. */
export const SentBackUnsaved: Story = {
  args: { server: fakeApi({ profile: { verification: 'rejected', verificationReason: 'The photos show another business.' } }) },
  play: async ({ canvas }) => {
    const box = await canvas.findByRole('region', { name: 'Your page wasn’t approved' })
    await userEvent.type(canvas.getByRole('textbox', { name: 'About your business' }), ' Fixed.')
    await expect(within(box).getByRole('button', { name: 'Send again' })).toBeDisabled()
  },
}

export const SentBackAdmin: Story = {
  args: {
    server: fakeApi({ level: 'admin', profile: { verification: 'rejected', verificationReason: 'The photos show another business.' } }),
  },
  play: async ({ canvas }) => {
    const box = await canvas.findByRole('region', { name: 'Your page wasn’t approved' })
    await expect(within(box).getByText(/the owner sends it again/)).toBeVisible()
    await expect(within(box).queryByRole('button', { name: 'Send again' })).toBeNull()
  },
}

/** An admin: the same details, «Online booking» without «Close this workspace» (the owner's). */
export const Admin: Story = {
  args: { server: fakeApi({ level: 'admin' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 3, name: 'Online booking' })).toBeVisible()
    await expect(canvas.queryByText('Close this workspace')).toBeNull()
  },
}

/** The phone: the rows stack, the save bar above the tab bar. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
