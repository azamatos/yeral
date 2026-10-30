/**
 * The review modal (Account-Bookings `view=review`, book C-34, C-35): a new review from «Write a review» or the
 * «How was it?» card's stars, a written one changed within its 7 days, the words cut at 500, the api's refusal and its
 * failure, the phone's bottom sheet; the «How was it?» card alone (F-243), as the home page will mount it, and with
 * words a third longer at 390. Over a fake api that answers like the real one (the booking with its review, or the
 * error; the card's visit until it's reviewed or closed).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BookingDetail, BookingSummary } from '@yeral/contract/bookings'
import { addDays, today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { authApi, AYJEMAL, fakeFetch, json, PageStory, person, refuse, type AuthApiOptions } from '@/shared/storybook'
import type { WrittenReview } from '../model/review-form'
import { HowWasItCard } from './how-was-it-card'
import { ReviewModal, type ReviewedBooking } from './review-modal'

const DAY = 86_400_000

/** Ak Diş, a check-up with Dr Döwlet three days ago (Account-Bookings `YR-46511`). */
const VISIT: ReviewedBooking = {
  code: 'YR-46511',
  business: {
    slug: 'ak-dis',
    name: 'Ak Diş',
    example: false,
    category: 'Dentist',
    photo: { url: '/photos/benyamin-bohlouli-e7MJLM5VGjY-unsplash.jpg', alt: 'Ak Diş' },
    phone: '+99312345670',
  },
  what: {
    type: 'appointment',
    items: [{ serviceId: 'akdis-checkup', service: 'Check-up', staffId: 'akdis-dowlet', staff: 'Dr Döwlet', start: 600, end: 630 }],
  },
  date: addDays(today(), -3),
  start: 600,
}

/** The same visit as the «How was it?» card has it (`GET /me/how-was-it`'s `visit`). */
const SUMMARY: BookingSummary = {
  ...VISIT,
  end: 630,
  status: 'completed',
  cancelledBy: null,
  price: { type: 'fixed', amount: 150 },
  source: 'web',
}

/** What the stories' api was sent: each review, as the body went; the visits whose card was closed. */
const sent: { method: string; body: Record<string, unknown> }[] = []
const closed: string[] = []

/**
 * The api: the person (`authApi`), the booking's review, answered as `refusal` (a 409, or `status`) when one is given,
 * and the «How was it?» card's visit (none once it's reviewed or closed).
 */
const reviewApi =
  ({ refusal, status = 409, ...auth }: AuthApiOptions & { refusal?: string; status?: number } = {}) =>
  (): typeof fetch => {
    sent.length = 0
    closed.length = 0
    const signIn = authApi({ signedIn: AYJEMAL, ...auth })()
    const mine = fakeFetch(({ route, body }) => {
      if (route === 'GET /me/how-was-it') return json({ visit: sent.length > 0 || closed.length > 0 ? null : SUMMARY })
      const closing = /^POST \/me\/bookings\/([^/]+)\/how-was-it\/close$/.exec(route)
      if (closing?.[1]) {
        closed.push(closing[1])
        return json(null, 204)
      }
      const review = /^(POST|PATCH) \/me\/bookings\/([^/]+)\/review$/.exec(route)
      if (!review) return undefined
      if (refusal) return refuse(status, refusal)
      sent.push({ method: review[1]!, body })
      return json({ ...VISIT, status: 'completed', review: { ...body, text: body.text ?? null, createdAt: Date.now() } })
    })
    return (input, init) => {
      const url = new Request(input, init).url
      return url.includes('/review') || url.includes('/how-was-it') ? mine(input, init) : signIn(input, init)
    }
  }

/** A row's «Write a review» (or «Edit review») that opens the modal, as My bookings will. */
function opener(props: { review?: WrittenReview; rating?: number }) {
  return function Row() {
    const [open, setOpen] = useState(false)
    const [done, setDone] = useState<BookingDetail | null>(null)
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <Button variant="secondary" size="s" onClick={() => setOpen(true)}>
          {props.review ? 'Edit review' : 'Write a review'}
        </Button>
        {done?.review && <span>{`${done.review.rating} · You rated`}</span>}
        <ReviewModal booking={VISIT} {...props} open={open} onOpenChange={setOpen} onDone={setDone} />
      </div>
    )
  }
}

const meta = {
  title: 'Client/Features/WriteReview',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang': opener({}) }, server: reviewApi() },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']
const body = within(document.body)

async function open(canvas: Canvas, name = 'Write a review') {
  await userEvent.click(await canvas.findByRole('button', { name }))
  const dialog = await body.findByRole('dialog', { name: 'How was it?' })
  await waitFor(() => expect(dialog).toBeVisible())
  return within(dialog)
}

/**
 * A new review: Send waits for the stars («Pick the stars»); the stars, two tags and the words go; the toast thanks,
 * the modal closes, the focus goes back to «Write a review».
 */
export const New: Story = {
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await expect(modal.getByText('Ak Diş')).toBeVisible()
    await expect(modal.getByText(/^Check-up · Dr Döwlet · /)).toBeVisible()
    await expect(modal.getAllByText('Pick the stars')[0]).toBeVisible()
    await expect(modal.getByRole('radiogroup', { name: 'Rating' })).toHaveAttribute('aria-required', 'true')
    const send = modal.getByRole('button', { name: 'Send review' })
    await expect(send).toBeDisabled()
    await expect(await modal.findByText(/: Aýjemal G\.$/)).toBeVisible()
    await userEvent.click(modal.getByRole('radio', { name: '5 stars' }))
    await userEvent.click(modal.getByRole('button', { name: 'On time' }))
    await userEvent.click(modal.getByRole('button', { name: 'Skilled specialist' }))
    await expect(modal.getByRole('button', { name: 'On time' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.type(modal.getByRole('textbox', { name: /Your review/ }), ' Very gentle and quick. ')
    await expect(modal.getByText('24 / 500')).toBeVisible()
    await userEvent.click(send)
    const thanks = await body.findByText('Thank you! Your review is published.')
    await waitFor(() => expect(thanks).toBeVisible())
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await expect(sent).toEqual([{ method: 'POST', body: { rating: 5, tags: ['on_time', 'skilled'], text: 'Very gentle and quick.' } }])
    await expect(await canvas.findByText('5 · You rated')).toBeVisible()
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Write a review' })).toHaveFocus())
  },
}

/** From the «How was it?» card's stars (F-243): the 4 pressed are picked, Send is ready; «Later» closes, nothing sent. */
export const FromCard: Story = {
  args: { routes: { '/$lang': opener({ rating: 4 }) } },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await expect(modal.getByRole('radio', { name: '4 stars' })).toBeChecked()
    // the word seen beside the stars (and said, in its own hidden line)
    await expect(modal.getAllByText('Good')[0]).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Send review' })).toBeEnabled()
    await userEvent.click(modal.getByRole('button', { name: 'Later' }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await expect(sent).toEqual([])
  },
}

const WRITTEN: WrittenReview = { rating: 4, tags: ['clean'], text: 'Clean and calm.', createdAt: Date.now() - 2 * DAY }

/** Changing a written review (C-35): as written, Save waits for a change; until when it can change; the edit goes. */
export const Edit: Story = {
  args: { routes: { '/$lang': opener({ review: WRITTEN }) } },
  play: async ({ canvas }) => {
    const modal = await open(canvas, 'Edit review')
    await expect(modal.getByRole('radio', { name: '4 stars' })).toBeChecked()
    await expect(modal.getByRole('button', { name: 'Clean' })).toHaveAttribute('aria-pressed', 'true')
    await expect(modal.getByRole('textbox', { name: /Your review/ })).toHaveValue('Clean and calm.')
    await expect(modal.getByText(/^You can change your review until \w{3}, \d+ \w{3}, \d{2}:\d{2}\.$/)).toBeVisible()
    // a written review keeps the name it was signed with: no line about it
    await expect(modal.queryByText(/will show with your first name/)).toBeNull()
    const save = modal.getByRole('button', { name: 'Save changes' })
    await expect(save).toBeDisabled()
    await userEvent.click(modal.getByRole('radio', { name: '5 stars' }))
    await userEvent.click(save)
    const changed = await body.findByText('Your review is changed.')
    await waitFor(() => expect(changed).toBeVisible())
    await expect(sent).toEqual([{ method: 'PATCH', body: { rating: 5, tags: ['clean'], text: 'Clean and calm.' } }])
  },
}

/** The words stop at 500 (the board cuts them there), the counter at its limit. */
export const Limit: Story = {
  args: { routes: { '/$lang': opener({ rating: 5 }) } },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    const words = modal.getByRole('textbox', { name: /Your review/ })
    await userEvent.click(words)
    await userEvent.paste('a'.repeat(510))
    await expect(words).toHaveValue('a'.repeat(500))
    await expect(modal.getByText('500 / 500')).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Send review' })).toBeEnabled()
  },
}

/** The api refuses (30 days after the visit): the modal closes with the reason in a toast; the booking is read again. */
export const Refused: Story = {
  args: { routes: { '/$lang': opener({ rating: 5 }) }, server: reviewApi({ refusal: 'review_window_passed' }) },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await userEvent.click(modal.getByRole('button', { name: 'Send review' }))
    const why = await body.findByText('Reviews can be written up to 30 days after the visit.')
    await waitFor(() => expect(why).toBeVisible())
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
  },
}

/** The api fails (down, no connection): the modal stays with the words written and says so; Send tries again. */
export const Failed: Story = {
  args: { routes: { '/$lang': opener({ rating: 5 }) }, server: reviewApi({ refusal: 'internal', status: 500 }) },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await userEvent.click(modal.getByRole('textbox', { name: /Your review/ }))
    await userEvent.paste('Lovely.')
    await userEvent.click(modal.getByRole('button', { name: 'Send review' }))
    await expect(await modal.findByText('Something went wrong. Please try again.')).toBeVisible()
    await expect(body.getByRole('dialog', { name: 'How was it?' })).toBeVisible()
    await expect(modal.getByRole('textbox', { name: /Your review/ })).toHaveValue('Lovely.')
    await expect(modal.getByRole('button', { name: 'Send review' })).toBeEnabled()
  },
}

/** Someone without a name yet: the line says how the name will show, without one. */
export const NoName: Story = {
  args: { server: reviewApi({ signedIn: person('+99365000001', null) }) },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await expect(await modal.findByText('Your review will show with your first name and the first letter of your surname.')).toBeVisible()
  },
}

/** The phone (under 768): a bottom sheet; the actions share the width. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await expect(modal.getByRole('button', { name: 'Send review' })).toBeVisible()
  },
}

/**
 * The «How was it?» card alone (F-243), as the home page will mount it: the visit the api asks about; a star pressed
 * opens the form with it picked, «Later» sends nothing and the stars empty again with the focus back on the one
 * pressed; the cross closes the card for good.
 */
export const Card: Story = {
  args: { routes: { '/$lang': () => <HowWasItCard className="m-6" /> } },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('region', { name: 'How was it?' }))
    await expect(card.getByText('Ak Diş')).toBeVisible()
    await expect(card.getByText(/^Check-up · Dr Döwlet · \w{3}, \d+ \w{3}$/)).toBeVisible()
    await userEvent.click(card.getByRole('radio', { name: '4 stars' }))
    const modal = within(await body.findByRole('dialog', { name: 'How was it?' }))
    await expect(modal.getByRole('radio', { name: '4 stars' })).toBeChecked()
    await userEvent.click(modal.getByRole('button', { name: 'Later' }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await expect(sent).toEqual([])
    await expect(card.getByRole('radio', { name: '4 stars' })).not.toBeChecked()
    await waitFor(() => expect(card.getByRole('radio', { name: '4 stars' })).toHaveFocus())
    await userEvent.click(card.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'How was it?' })).toBeNull())
    await expect(closed).toEqual(['YR-46511'])
  },
}

/** The card sent from: the review goes with the stars pressed, the card is gone and the focus where the caller says. */
export const CardSent: Story = {
  args: { routes: { '/$lang': () => <HowWasItCard className="m-6" /> } },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('region', { name: 'How was it?' }))
    await userEvent.click(card.getByRole('radio', { name: '5 stars' }))
    const modal = within(await body.findByRole('dialog', { name: 'How was it?' }))
    await userEvent.click(modal.getByRole('button', { name: 'Send review' }))
    // the story before may have thanked moments ago (a toast lives 4–6 s): one of them is this story's, seen
    await waitFor(() => expect(body.getAllByText('Thank you! Your review is published.').some((el) => el.checkVisibility())).toBe(true))
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'How was it?' })).toBeNull())
    await expect(sent).toEqual([{ method: 'POST', body: { rating: 5, tags: [] } }])
  },
}

/** The card on a phone with words a third longer (Storybook's «Text: Russian length», #238): nothing overflows 390. */
export const CardLongWords: Story = {
  args: { routes: { '/$lang': () => <HowWasItCard className="m-4" /> } },
  globals: { viewport: { value: 'xs' }, text: 'longer' },
  play: async ({ canvas }) => {
    // the words are stretched: the names start as written
    const region = await canvas.findByRole('region', { name: /^How was it\?/ })
    await expect(within(region).getByRole('radio', { name: /^5 stars/ })).toBeVisible()
    await expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  },
}
