/**
 * Reviews — B-Reviews (v0.6 round 3, English; v0.7 foundations), in the app's shell over a `fetch` that answers like
 * the api: the rating summary with the uncounted line, the chips, the specialist and the order in the address, the
 * reply composer (post, change, delete with Undo), reporting a review, Ýeral's three moderation outcomes, pages of 20,
 * the empty states, a failed page, a specialist who only reads, a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { TeamReview } from '@yeral/contract/reviews'
import type { Workspace } from '@yeral/contract/team'
import type { ReviewReportReason } from '@yeral/domain/model'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { ReviewsPage } from './reviews-page'

/** Opens our own Select (design v0.7 · A2) and picks a row in its listbox. */
async function pick(trigger: HTMLElement, option: string | RegExp) {
  await userEvent.click(trigger)
  const list = await page.findByRole('listbox')
  await userEvent.click(await within(list).findByRole('option', { name: option }))
  await waitFor(() => expect(page.queryByRole('listbox')).not.toBeInTheDocument())
}

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
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const AYNA = id(2)
const MARAL = id(3)
const LEYLI = id(4)
const glow = (level: Workspace['level'], reviewsToAnswer = 0): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: 'Bitarap Türkmenistan şaýoly 12',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level,
  staffId: level === 'specialist' ? AYNA : id(1),
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer,
  requestsToAnswer: 0,
  lastOpenedAt: null,
})
const team = [
  { id: id(1), name: 'Maýsa', level: 'owner' },
  { id: AYNA, name: 'Aýna', level: 'specialist' },
  { id: MARAL, name: 'Maral', level: 'specialist' },
  { id: LEYLI, name: 'Leýli', level: 'specialist' },
].map((m) => ({
  ...m,
  fullName: null,
  specialization: null,
  phone: null,
  status: 'active',
  ended: null,
  hasApp: true,
  bookable: true,
  canAnswerOwn: false,
  joined: true,
}))

const DAY = 86_400_000
const now = Date.now()
type Sample = TeamReview & { staff: string }
const review = (
  n: number,
  author: string,
  rating: number,
  what: string,
  staff: string,
  daysAgo: number,
  text: string | null,
  patch: Partial<Sample> = {},
): Sample => ({
  id: id(100 + n),
  author,
  rating,
  tags: [],
  text,
  createdAt: now - daysAgo * DAY - 3_600_000,
  what,
  staff,
  reply: null,
  report: null,
  ...patch,
})
const reply = (text: string, daysAgo: number) => ({ text, at: now - daysAgo * DAY, by: 'Maýsa' })
const report = (state: 'checking' | 'counted' | 'cleared', reason: ReviewReportReason = 'fake') => ({
  reason,
  text: null,
  at: now - DAY,
  by: 'Maýsa',
  state,
})

const samples = (): Sample[] => [
  review(1, 'Döwran S.', 5, "Men's haircut · Aýna", AYNA, 0, 'Quick and neat, exactly the cut I asked for. The place is spotless.'),
  review(2, 'Mähri G.', 5, 'Manicure · Maral', MARAL, 1, 'Maral is careful and friendly. The colour lasted two weeks without a chip.'),
  review(3, 'Merdan K.', 1, 'Back massage · Leýli', LEYLI, 1, 'Waited forty minutes and the massage was half the time I paid for.', {
    report: report('checking'),
  }),
  review(
    4,
    'Gözel A.',
    5,
    'Back massage · Leýli',
    LEYLI,
    1,
    'Leýli found the knot in my shoulder in a minute. I booked again on the way out.',
    {
      reply: reply('Thank you, Gözel! See you next week.', 1),
    },
  ),
  review(5, 'Aýjemal Gurbanowa', 4, 'Women’s haircut · Aýna', AYNA, 2, null),
  review(
    6,
    'Gülälek N.',
    5,
    'Hair colouring · Aýna',
    AYNA,
    14,
    'Aýna picked an ammonia-free colour because of my allergy and it came out exactly as on the photo.',
    {
      reply: reply('Thank you, Gülälek! We keep the ammonia-free range for you.', 13),
    },
  ),
  review(7, 'Jemal S.', 5, 'Pedicure · Maral', MARAL, 20, null, { reply: reply('Thank you, Jemal!', 19) }),
]
/** The three outcomes of a report, on three reviews. */
const moderated = (): Sample[] => [
  samples()[2]!,
  review(8, 'Selbi A.', 2, 'Manicure · Maral', MARAL, 5, 'The polish chipped on the second day.', {
    report: report('cleared', 'other_business'),
  }),
  review(9, 'Bahar M.', 1, 'Haircut · Aýna', AYNA, 9, 'Not what I asked for.', { report: report('counted', 'insulting') }),
  ...samples().slice(3),
]
const many = (): Sample[] => [
  ...samples(),
  ...Array.from({ length: 17 }, (_, i) =>
    review(20 + i, `Client ${i + 1}`, 5, 'Manicure · Maral', MARAL, 30 + i, 'Lovely as always.', { reply: reply('Thank you!', 29 + i) }),
  ),
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

type Options = { reviews?: () => Sample[]; failMore?: boolean; stall?: boolean; reportedMeanwhile?: boolean }

/** The api as the stories need it: the list with its filters and pages, the summary recounted after every change. */
const fakeApi =
  (
    level: Workspace['level'],
    { reviews = samples, failMore = false, stall = false, reportedMeanwhile = false }: Options = {},
  ): (() => typeof fetch) =>
  () => {
    const rows = reviews()
    const summary = () => {
      const counted = rows.filter((r) => r.report?.state !== 'checking')
      const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
      for (const r of counted) breakdown[r.rating as 1 | 2 | 3 | 4 | 5] += 1
      const rating = counted.length ? counted.reduce((n, r) => n + r.rating, 0) / counted.length : null
      return { rating, count: counted.length, breakdown, unanswered: rows.filter((r) => !r.reply).length }
    }
    const answer = async (request: Request): Promise<Response> => {
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      const w = glow(level, summary().unanswered)
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (route === 'GET /w/glow-studio/requests') return json({ items: [] })
      if (route === 'GET /w/glow-studio/team') return json({ items: team })
      if (route === 'GET /w/glow-studio/reviews') {
        if (stall) return new Promise(() => {})
        const q = url.searchParams
        const offset = Number(q.get('cursor') ?? 0)
        if (offset && failMore) return json({ error: { code: 'internal' } }, 500)
        // as the api: a specialist asks for nobody else's reviews
        if (level === 'specialist' && q.get('staff') && q.get('staff') !== AYNA) return json({ error: { code: 'forbidden' } }, 403)
        const mine = level === 'specialist' ? rows.filter((r) => r.staff === AYNA) : rows
        const items = mine
          .filter((r) => (q.get('unanswered') ? !r.reply : true))
          .filter((r) => (q.get('stars') ? r.rating === Number(q.get('stars')) : true))
          .filter((r) => (q.get('staff') ? r.staff === q.get('staff') : true))
          .sort((a, b) => {
            const sort = q.get('sort') ?? 'newest'
            if (sort === 'oldest') return a.createdAt - b.createdAt
            if (sort === 'lowest') return a.rating - b.rating || b.createdAt - a.createdAt
            if (sort === 'highest') return b.rating - a.rating || b.createdAt - a.createdAt
            return b.createdAt - a.createdAt
          })
        const pageRows = items.slice(offset, offset + 20).map(({ staff: _staff, ...r }) => r)
        return json({
          items: pageRows,
          total: items.length,
          cursor: offset + 20 < items.length ? String(offset + 20) : null,
          summary: level === 'specialist' ? null : summary(),
        })
      }
      const m = /^(PUT|DELETE|POST) \/w\/glow-studio\/reviews\/([^/]+)\/(reply|report)$/.exec(route)
      if (m) {
        const r = rows.find((x) => x.id === m[2])
        if (!r) return json({ error: { code: 'not_found' } }, 404)
        if (m[3] === 'reply' && m[1] === 'PUT')
          r.reply = { text: ((await request.json()) as { text: string }).text, at: Date.now(), by: 'Maýsa' }
        if (m[3] === 'reply' && m[1] === 'DELETE') r.reply = null
        if (m[3] === 'report') {
          const body = (await request.json()) as { reason: ReviewReportReason; text?: string }
          // an administrator reported it a moment earlier: the report is theirs, the answer is 409
          if (reportedMeanwhile && !r.report) r.report = { reason: 'spam', text: null, at: Date.now(), by: 'Leýli', state: 'checking' }
          if (r.report) return json({ error: { code: 'already_reported' } }, 409)
          r.report = { reason: body.reason, text: body.text ?? null, at: Date.now(), by: 'Maýsa', state: 'checking' }
        }
        return new Response(null, { status: 204 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
    return (input: RequestInfo | URL, init?: RequestInit) => answer(new Request(input, init))
  }

const meta = {
  title: 'Business/Reviews',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {},
    layouts: { '/w/$slug': { component: WorkspaceShell, children: { reviews: ReviewsPage } } },
    path: '/w/glow-studio/reviews',
    server: fakeApi('owner'),
  },
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

/** The summary as clients see it (the reported review isn't counted), the chips, the reviews with their replies. */
export const Summary: Story = {
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('region', { name: 'Rating summary' }))
    await expect(summary.getByText('6 reviews')).toBeVisible()
    await expect(summary.getByText('1 more isn’t counted while Ýeral checks it')).toBeVisible()
    await expect(summary.getByRole('img', { name: '5 stars: 5 reviews' })).toBeVisible()
    await expect(summary.getByRole('button', { name: 'Not answered · 4' })).toBeVisible()
    const list = within(canvas.getByRole('region', { name: 'Reviews' }))
    await expect(list.getByText('Döwran S.')).toBeVisible()
    await expect(list.getByText('Thank you, Gözel! See you next week.')).toBeVisible()
    await expect(canvas.getByText('You can’t delete reviews. Report one only if it’s false, abusive or an ad.')).toBeVisible()
  },
}

/** Not answered, a star count, a specialist and the order, each in the address. */
export const Filters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Reviews' })
    await userEvent.click(canvas.getByRole('radio', { name: 'Not answered' }))
    await waitFor(() => expect(canvas.queryByText('Gözel A.')).toBeNull())
    await expect(canvas.getByText('Döwran S.')).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: '1 star' }))
    await expect(await canvas.findByText('Merdan K.')).toBeVisible()
    await waitFor(() => expect(canvas.queryByText('Döwran S.')).toBeNull())
    await userEvent.click(canvas.getByRole('radio', { name: 'All' }))
    await pick(canvas.getByRole('combobox', { name: 'Filter by specialist' }), 'Aýna')
    await expect(await canvas.findByText('Gülälek N.')).toBeVisible()
    await waitFor(() => expect(canvas.queryByText('Mähri G.')).toBeNull())
    await pick(canvas.getByRole('combobox', { name: 'Sort' }), 'Oldest first')
    await waitFor(async () => {
      const articles = canvas.getAllByRole('article')
      await expect(articles).toHaveLength(3)
      await expect(within(articles[0]!).getByText('Gülälek N.')).toBeVisible()
    })
  },
}

/** Reply to a review: the composer with its counter, Post reply, the reply block. */
export const Reply: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Reply to Döwran S.' }))
    const box = canvas.getByRole('textbox', { name: 'Your reply as Glow Studio' })
    await expect(canvas.getByRole('button', { name: 'Post reply' })).toBeDisabled()
    await userEvent.type(box, 'Thank you, Döwran! See you again soon.')
    await expect(canvas.getByText('38 / 500')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Post reply' }))
    await page.findByText('Reply posted')
    await waitFor(() => expect(canvas.getByText('Thank you, Döwran! See you again soon.')).toBeVisible())
    await expect(canvas.getByText('Just now')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Reply to Döwran S.' })).toBeNull()
    // the focus moves on to the reply's Change
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Change the reply to Döwran S.' })).toHaveFocus())
  },
}

/** Cancel closes the composer and gives the focus back to Reply. */
export const CancelReply: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Reply to Döwran S.' }))
    await expect(canvas.getByRole('textbox', { name: 'Your reply as Glow Studio' })).toHaveFocus()
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Reply to Döwran S.' })).toHaveFocus())
  },
}

/** Change a reply: the composer holds the words, Save until they change. */
export const EditReply: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change the reply to Gözel A.' }))
    const box = canvas.getByRole('textbox', { name: 'Your reply as Glow Studio' })
    await expect(box).toHaveValue('Thank you, Gözel! See you next week.')
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.type(box, ' Leýli sends her regards.')
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await page.findByText('Reply updated')
    await waitFor(() => expect(canvas.getByText('Thank you, Gözel! See you next week. Leýli sends her regards.')).toBeVisible())
  },
}

/** Delete a reply, then Undo in the toast brings it back. */
export const DeleteReply: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete the reply to Gözel A.' }))
    await page.findByText('Reply deleted')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Reply to Gözel A.' })).toHaveFocus())
    await userEvent.click(page.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(canvas.getByText('Thank you, Gözel! See you next week.')).toBeVisible())
  },
}

/** Too long: the counter turns into the error and Post reply waits. */
export const ReplyTooLong: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Reply to Mähri G.' }))
    const box = canvas.getByRole('textbox', { name: 'Your reply as Glow Studio' })
    await userEvent.click(box)
    await userEvent.paste('x'.repeat(501))
    await expect(await canvas.findByText('Too long: up to 500 characters.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Post reply' })).toBeDisabled()
  },
}

/** Report a review: the modal with the quote, a reason, the explanation needed for «Another reason», the toast. */
export const Report: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Review by Mähri G.: actions' }))
    await userEvent.click(await page.findByRole('menuitem', { name: /Report/ }))
    const d = within(await page.findByRole('dialog', { name: 'Report the review' }))
    await expect(d.getByText('Maral is careful and friendly. The colour lasted two weeks without a chip.')).toBeVisible()
    await expect(d.getByRole('button', { name: 'Report' })).toBeDisabled()
    await userEvent.click(d.getByRole('radio', { name: 'Another reason' }))
    await expect(d.getByRole('textbox', { name: 'Explanation' })).toBeVisible()
    await expect(d.getByRole('button', { name: 'Report' })).toBeDisabled()
    await userEvent.click(d.getByRole('radio', { name: 'Ad or spam' }))
    await expect(d.getByRole('textbox', { name: 'Explanation (optional)' })).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Report' }))
    await page.findByText('Report sent · Ýeral checks it within 48 hours')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(canvas.getAllByText('Ýeral is checking · not counted in your rating')).toHaveLength(2))
    await expect(canvas.getByText('Reason: Ad or spam')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Review by Mähri G.: actions' })).toBeNull()
  },
}

/** Someone else reported it a moment earlier: the api refuses, the modal closes, the list shows the check. */
export const ReportedMeanwhile: Story = {
  args: { server: fakeApi('owner', { reportedMeanwhile: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Review by Mähri G.: actions' }))
    await userEvent.click(await page.findByRole('menuitem', { name: /Report/ }))
    const d = within(await page.findByRole('dialog', { name: 'Report the review' }))
    await userEvent.click(d.getByRole('radio', { name: 'Ad or spam' }))
    await userEvent.type(d.getByRole('textbox', { name: 'Explanation (optional)' }), 'Copied from a shop ad.')
    await expect(d.getByText('22 / 300')).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Report' }))
    await page.findByText('A report was already sent.')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(canvas.getAllByText('Ýeral is checking · not counted in your rating')).toHaveLength(2))
    await expect(canvas.queryByRole('button', { name: 'Review by Mähri G.: actions' })).toBeNull()
  },
}

/** Ýeral's three outcomes: checking (not counted), kept, no decision in 48 hours; none can be reported again. */
export const Reported: Story = {
  args: { server: fakeApi('owner', { reviews: moderated }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ýeral is checking · not counted in your rating')).toBeVisible()
    await expect(canvas.getByText('Reason: False — this client never came')).toBeVisible()
    await expect(canvas.getByText('Ýeral kept this review')).toBeVisible()
    await expect(canvas.getByText('No decision in 48 hours')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Review by Selbi A.: actions' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Review by Bahar M.: actions' })).toBeNull()
  },
}

/** Pages of 20: Show more appends in place and says how many are shown. */
export const ShowMore: Story = {
  args: { server: fakeApi('owner', { reviews: many }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Showing 20 of 24')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Show more' }))
    await waitFor(() => expect(canvas.getAllByRole('article')).toHaveLength(24))
    await expect(canvas.queryByRole('button', { name: 'Show more' })).toBeNull()
  },
}

/** The next page fails: the rows stay, a toast says so. */
export const ShowMoreFailed: Story = {
  args: { server: fakeApi('owner', { reviews: many, failMore: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Show more' }))
    await page.findByText('Something went wrong. Please try again.')
    await expect(canvas.getAllByRole('article')).toHaveLength(20)
  },
}

export const NoReviews: Story = {
  args: { server: fakeApi('owner', { reviews: () => [] }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No reviews yet')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'See your page' })).toBeVisible()
    await expect(canvas.queryByRole('region', { name: 'Rating summary' })).toBeNull()
  },
}

/** Every review answered, seen from the Not answered chip. */
export const AllAnswered: Story = {
  args: { server: fakeApi('owner', { reviews: () => samples().slice(3, 4) }), path: '/w/glow-studio/reviews?filter=unanswered' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('You’ve answered every review')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Show all reviews' }))
    await expect(await canvas.findByText('Gözel A.')).toBeVisible()
    await expect(canvas.getByText('All reviews answered')).toBeVisible()
  },
}

export const NoMatch: Story = {
  args: { path: '/w/glow-studio/reviews?stars=2' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No reviews match these filters')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(await canvas.findByText('Döwran S.')).toBeVisible()
  },
}

export const Loading: Story = {
  args: { server: fakeApi('owner', { stall: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('img', { name: 'Loading the reviews' })).toBeInTheDocument()
  },
}

/**
 * A specialist reads the reviews about her: no summary, no Not answered, no reply, no report. A shared address with
 * another specialist or «not answered» in it asks the api for neither (it would refuse the first).
 */
export const Specialist: Story = {
  args: { server: fakeApi('specialist'), path: `/w/glow-studio/reviews?staff=${MARAL}&filter=unanswered` },
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole('region', { name: 'Reviews about you' }))
    await expect(canvas.getByRole('radio', { name: 'All' })).toBeChecked()
    await expect(canvas.getByText('Reviews about you, from clients after their visits. The owner and admins reply to them.')).toBeVisible()
    await expect(canvas.queryByRole('region', { name: 'Rating summary' })).toBeNull()
    await expect(list.getByText('Gülälek N.')).toBeVisible()
    await expect(list.queryByText('Mähri G.')).toBeNull()
    await expect(list.getByText('Thank you, Gülälek! We keep the ammonia-free range for you.')).toBeVisible()
    await expect(canvas.queryByRole('radio', { name: 'Not answered' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Reply to/ })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Change the reply/ })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /actions$/ })).toBeNull()
  },
}

export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Döwran S.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Reply to Döwran S.' })).toBeVisible()
  },
}

/** The report modal as a sheet on a phone. */
export const PhoneReport: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Review by Mähri G.: actions' }))
    await userEvent.click(await page.findByRole('menuitem', { name: /Report/ }))
    await expect(await page.findByRole('dialog', { name: 'Report the review' })).toBeVisible()
  },
}

/** The words about a third longer (Russian). */
export const RussianLength: Story = { globals: { text: 'longer' } }
