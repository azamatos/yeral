/**
 * The new booking at real scale (B7-Booking · B7): 100 clients with five Jahans, 100 services in 15 groups, over a
 * `fetch` that answers like the api. The one Client field (frequent clients, letters, digits, no match → a new client,
 * the chosen card), the services by «Jeren’s services · All services» with a search, and the 390 sheet.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addDays, epochOf } from '@yeral/domain/time'
import { expect, fn, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { NewBookingDrawer } from './new-booking-drawer'

const DAY = '2026-10-14'
const NOW = epochOf(DAY, 680)
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const people = [
  { staffId: id(1), name: 'Jeren Ataýewa' },
  { staffId: id(2), name: 'Aýna Gurbanowa' },
  { staffId: id(3), name: 'Maral Öwezowa' },
]

const GROUPS = [
  'Facials',
  'Brows & lashes',
  'Treatments',
  'Hair',
  'Colouring',
  'Nails',
  'Pedicure',
  'Massage',
  'Waxing',
  'Make-up',
  'Men',
  'Kids',
  'Spa',
  'Barber',
  'Laser',
]
const NAMES = [
  ['Facial cleansing', 'Hydrating facial', 'Peeling', 'Anti-age facial', 'Face massage', 'Acne treatment', 'Collagen mask'],
  [
    'Brow shaping',
    'Brow colouring',
    'Brow lamination',
    'Lash colouring',
    'Lash lift',
    'Lash extensions',
    'Lash removal',
    'Brow and lash colouring',
  ],
  ['Dermapen', 'Mesotherapy', 'Carboxy mask', 'Ultrasonic cleansing', 'LED therapy'],
  ['Women’s haircut', 'Hair styling', 'Blow-dry', 'Fringe cut', 'Keratin', 'Botox for hair', 'Braids'],
  ['Hair colouring', 'Roots colouring', 'Highlights', 'Balayage', 'Colour gloss', 'Toning', 'Grey coverage'],
  ['Manicure', 'Gel manicure', 'Nail extensions', 'Nail art', 'Polish change', 'Nail repair', 'Paraffin hands'],
  ['Pedicure', 'Gel pedicure', 'Medical pedicure', 'Paraffin feet', 'Heel treatment', 'Polish change (feet)', 'Spa pedicure'],
  ['Back massage', 'Full body massage', 'Head massage', 'Foot massage', 'Hot stones', 'Lymphatic massage', 'Sports massage'],
  ['Legs waxing', 'Arms waxing', 'Bikini waxing', 'Upper lip waxing', 'Brow waxing', 'Full body waxing', 'Sugaring'],
  ['Day make-up', 'Evening make-up', 'Bridal make-up', 'Make-up lesson', 'Lashes (strip)', 'Contouring', 'Photo make-up'],
  ['Men’s haircut', 'Beard trim', 'Royal shave', 'Men’s colouring', 'Head shave', 'Men’s facial', 'Men’s manicure'],
  ['Kids’ haircut', 'Kids’ braids', 'First haircut', 'Kids’ manicure', 'Kids’ styling', 'Kids’ fringe', 'Kids’ wash'],
  ['Sauna', 'Hammam', 'Body scrub', 'Body wrap', 'Chocolate wrap', 'Salt scrub', 'Aroma bath'],
  ['Fade', 'Scissor cut', 'Beard colouring', 'Hot towel shave', 'Line-up', 'Kids’ fade', 'Wash and style'],
  ['Laser legs', 'Laser arms', 'Laser bikini'],
]
/** 100 services in 15 groups; Jeren does the first three groups (20), Aýna the hair and colouring, Maral the rest. */
const menu = {
  groups: GROUPS.map((name, g) => ({
    id: id(100 + g),
    name: { en: name },
    services: NAMES[g]!.map((service, i) => ({
      id: id(1000 + g * 10 + i),
      groupId: id(100 + g),
      name: { en: service },
      description: null,
      durationMin: 30 + ((g + i) % 4) * 15,
      priceType: 'fixed',
      priceAmount: 40 + ((g * 7 + i * 13) % 20) * 10,
      bufferMin: null,
      online: true,
      staffIds: [g < 3 ? id(1) : g < 5 ? id(2) : id(3)],
    })),
  })),
}

const FIRST = [
  'Jahan',
  'Jahan',
  'Jahan',
  'Jahan',
  'Jahan',
  'Aýjahan',
  'Nurjahan',
  'Sona',
  'Gülälek',
  'Mähri',
  'Aýsoltan',
  'Ogulgerek',
  'Merjen',
  'Bahar',
  'Gözel',
  'Selbi',
  'Läle',
  'Jemal',
  'Maýa',
  'Enejan',
]
const LAST = [
  'Muradowa',
  'Saparowa',
  'Hojaýewa',
  'Annaýewa',
  'Berdiýewa',
  'Rejepowa',
  'Nurmuhammedowa',
  'Pirmuhammedowa',
  'Kakaýewa',
  'Amanowa',
]
/** 100 clients: five Jahans with 14, 9, 6, 3 and 1 visits, an Aýjahan and a Nurjahan, four numbers with «65 12». */
const clients = Array.from({ length: 100 }, (_, i) => {
  const visits = i < 5 ? [14, 9, 6, 3, 1][i]! : i === 5 ? 7 : i === 6 ? 2 : Math.max(0, 13 - (i % 17))
  const digits =
    i < 4 ? `65 12 ${30 + i} ${10 + i}` : `6${(i % 9) + 1} ${10 + ((i * 7) % 80)} ${10 + ((i * 3) % 80)} ${10 + ((i * 11) % 80)}`
  return {
    id: id(5000 + i),
    name: `${i < 7 ? FIRST[i] : FIRST[7 + (i % 13)]} ${LAST[(i + Math.floor(i / FIRST.length)) % LAST.length]}`,
    phone: `+993${digits.replace(/ /g, '')}`,
    tags: [],
    segments: visits === 0 ? [] : visits >= 6 ? ['regular'] : ['new'],
    phoneOnly: i === 11,
    visits,
    lastVisit: visits === 0 ? null : addDays(DAY, -(2 + ((i * 5) % 130))),
    total: null,
    avgCheck: null,
    next: null,
  }
})
const jahan = clients[0]!
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the drawer asks it: the menu, the clients list with `q` (a name or digits anywhere), the lookup, no free times. */
const answer = (input: Parameters<typeof fetch>[0]): Response => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const path = url.pathname.replace(/^\/v1/, '')
  if (path === '/w/glow-studio/services') return json(menu)
  if (path === '/w/glow-studio/clients') {
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const digits = /^\d+$/.test(q)
    const hits = clients
      .filter((c) => !q || (digits ? c.phone.replace(/\D/g, '').includes(q) : c.name.toLowerCase().includes(q)))
      .sort((a, b) => b.visits - a.visits)
    const items = hits.slice(0, Number(url.searchParams.get('limit') ?? 12))
    return json({ items, cursor: null, counts: { all: hits.length, regular: 0, new: 0, lapsed: 0, flagged: 0 } })
  }
  if (path === '/w/glow-studio/clients/lookup') {
    const digits = url.searchParams.get('phone')?.replace(/\D/g, '') ?? ''
    const hit = clients.find((c) => c.phone.replace(/\D/g, '').endsWith(digits))
    return json({
      items: hit
        ? [{ ...hit, alerts: hit.id === jahan.id ? ['Allergic to ammonia — only ammonia-free colour.'] : [], usualServices: [] }]
        : [],
    })
  }
  if (path.endsWith('/free-times')) return json({ nearest: [], date: url.searchParams.get('date') ?? DAY, slots: [], days: [] })
  return json({ error: { code: 'not_found' } }, 404)
}
const fakeApi = (): typeof fetch => (input) => Promise.resolve(answer(input))

const meta = {
  title: 'Business/Calendar/NewBooking',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {
      '/': () => (
        <NewBookingDrawer
          slug="glow-studio"
          start={{ date: DAY, staffId: id(1), start: 750 }}
          people={people}
          specialist={false}
          now={NOW}
          onClose={fn()}
        />
      ),
    },
    path: '/',
    server: fakeApi,
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']
const open = async (): Promise<Canvas> => within(await page.findByRole('dialog', { name: 'New booking' }))
const client = (d: Canvas) => d.getByRole('combobox', { name: 'Client' })

/** Nothing typed: the five most frequent clients with their number and «Last visit · visits», and «New client» last. */
export const FrequentClients: Story = {
  play: async () => {
    const d = await open()
    await userEvent.click(client(d))
    await expect(await d.findByText('Frequent clients')).toBeVisible()
    const list = within(d.getByRole('listbox', { name: 'Clients' }))
    await expect(list.getAllByRole('option')).toHaveLength(6)
    await expect(list.getAllByRole('option')[0]).toHaveTextContent(/^Jahan Muradowa.*Last visit 12 Oct · 14 visits$/)
    await expect(list.getByRole('option', { name: 'New client' })).toBeVisible()
  },
}

/** «jahan» finds the five Jahans, Aýjahan and Nurjahan, the match in bold, the regular, the lapsed and the new one told apart. */
export const Jahan: Story = {
  play: async () => {
    const d = await open()
    await userEvent.type(client(d), 'jahan')
    const list = within(await d.findByRole('listbox', { name: 'Clients' }))
    await waitFor(() => expect(list.getAllByRole('option')).toHaveLength(8))
    await expect(list.getAllByRole('option')[0]).toHaveTextContent('+993 65 12 30 10')
    await expect(list.getAllByRole('option')[6]).toHaveTextContent('1 visit')
    await expect(list.getByRole('option', { name: 'New client “jahan”' })).toBeVisible()
    await expect(d.queryByText(/keep typing/)).toBeNull()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect(await d.findByText('Allergic to ammonia — only ammonia-free colour.')).toBeVisible()
  },
}

/** «ja» has more than 8: the first 8 by visits and «Showing 8 of N — keep typing». */
export const KeepTyping: Story = {
  play: async () => {
    const d = await open()
    await userEvent.type(client(d), 'ja')
    await expect(await d.findByText(/^Showing 8 of \d+ — keep typing$/)).toBeVisible()
  },
}

/** Digits search the numbers: «65 12» finds four, the digits in bold wherever they sit. */
export const Digits: Story = {
  play: async () => {
    const d = await open()
    await userEvent.type(client(d), '65 12')
    const list = within(await d.findByRole('listbox', { name: 'Clients' }))
    await waitFor(() => expect(list.getAllByRole('option')).toHaveLength(5))
    await expect(list.getAllByRole('option')[0]!.querySelector('b')).toHaveTextContent('65 12')
    await expect(list.getByRole('option', { name: 'New client “65 12”' })).toBeVisible()
    await userEvent.click(list.getByRole('option', { name: 'New client “65 12”' }))
    await expect(await d.findByRole('textbox', { name: 'Phone number' })).toHaveValue('65 12')
  },
}

/** No match: only the line and the new-client row, already highlighted — Enter opens the form with the name typed. */
export const NoMatch: Story = {
  play: async () => {
    const d = await open()
    await userEvent.type(client(d), 'jahx')
    await expect(await d.findByText('No client “jahx”')).toBeVisible()
    await expect(d.getByRole('option', { name: 'New client “jahx”' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Enter}')
    await expect(await d.findByRole('textbox', { name: /^Name/ })).toHaveValue('jahx')
    await expect(d.getByRole('textbox', { name: 'Phone number' })).toHaveValue('')
  },
}

/** The chosen client as a card with Change; their alert note under it. */
export const Chosen: Story = {
  play: async () => {
    const d = await open()
    await userEvent.type(client(d), 'jahan mur')
    await userEvent.click(await d.findByRole('option', { name: /Jahan Muradowa/ }))
    await expect(await d.findByText('Allergic to ammonia — only ammonia-free colour.')).toBeVisible()
    await expect(d.getByText('Last visit 12 Oct · 14 visits')).toBeVisible()
    await expect(d.getByRole('button', { name: 'Change' })).toBeVisible()
  },
}

/** 100 services: Jeren’s 20 in 3 groups, the search over them, the other option's matches offered, a pick as a chip. */
export const Services: Story = {
  play: async () => {
    const d = await open()
    await expect(await d.findByRole('radio', { name: 'Jeren Ataýewa’s services' })).toBeChecked()
    await expect(d.getByRole('group', { name: 'Facials' })).toBeVisible()
    await expect(d.queryByRole('group', { name: 'Hair' })).toBeNull()
    await expect(d.getAllByRole('checkbox')).toHaveLength(20)
    const search = d.getByRole('searchbox', { name: 'Search 20 services' })
    await userEvent.type(search, 'colour')
    await waitFor(() => expect(d.getAllByRole('checkbox')).toHaveLength(3))
    await expect(d.getByText(/^5 matches in All services/)).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Show them' }))
    await expect(d.getByRole('radio', { name: 'All services' })).toBeChecked()
    await waitFor(() => expect(d.getAllByRole('checkbox')).toHaveLength(8))
    await userEvent.click(d.getByRole('checkbox', { name: /Hair colouring.*Jeren Ataýewa doesn’t do this/ }))
    await expect(d.getByRole('button', { name: 'Remove Hair colouring' })).toBeVisible()
    await expect(d.getByText('Total')).toBeVisible()
    await userEvent.clear(search)
    await userEvent.type(search, 'zzz')
    await expect(await d.findByText('No service “zzz” here')).toBeVisible()
  },
}

/** From the toolbar, no specialist yet: «Specialist’s services» waits, All services shows the 15 groups with counts. */
export const NoSpecialist: Story = {
  args: {
    routes: {
      '/': () => <NewBookingDrawer slug="glow-studio" start={{ date: DAY }} people={people} specialist={false} now={NOW} onClose={fn()} />,
    },
  },
  play: async () => {
    const d = await open()
    await expect(await d.findByRole('radio', { name: 'Specialist’s services' })).toBeDisabled()
    await expect(d.getByRole('radio', { name: 'All services' })).toBeChecked()
    await expect(d.getByRole('group', { name: 'Laser' })).toBeVisible()
    await expect(d.getByRole('searchbox', { name: 'Search 100 services' })).toBeVisible()
  },
}

/** The 390 sheet: the field is L 48, the rows under it, nothing leaves the sheet. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async () => {
    const d = await open()
    await userEvent.type(client(d), 'ja')
    await expect(await d.findByRole('listbox', { name: 'Clients' })).toBeVisible()
    const dialog = page.getByRole('dialog', { name: 'New booking' })
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
  },
}
