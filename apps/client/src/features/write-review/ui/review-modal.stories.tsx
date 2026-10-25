/**
 * The review modal (Account-Bookings `view=review`, book C-34, C-35): a new review from «Write a review» or the
 * «How was it?» card's stars, a written one changed within its 7 days, the words cut at 500, the api's refusal, the
 * phone's bottom sheet. Over a fake api that answers like the real one (the booking with its review, or the error).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BookingDetail } from '@yeral/contract/bookings'
import { addDays, today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { authApi, AYJEMAL, fakeFetch, json, PageStory, person, refuse, type AuthApiOptions } from '@/shared/storybook'
import type { WrittenReview } from '../model/review-form'
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
  what: { type: 'appointment', items: [{ service: 'Check-up', staff: 'Dr Döwlet', start: 600, end: 630 }] },
  date: addDays(today(), -3),
  start: 600,
}

/** What the stories' api was sent: each review, as the body went. */
const sent: { method: string; body: Record<string, unknown> }[] = []

/** The api: the person (`authApi`) and the booking's review, answered as `refusal` when one is given. */
const reviewApi =
  ({ refusal, ...auth }: AuthApiOptions & { refusal?: string } = {}) =>
  (): typeof fetch => {
    sent.length = 0
    const signIn = authApi({ signedIn: AYJEMAL, ...auth })()
    const mine = fakeFetch(({ route, body }) => {
      const review = /^(POST|PATCH) \/me\/bookings\/([^/]+)\/review$/.exec(route)
      if (!review) return undefined
      if (refusal) return refuse(409, refusal)
      sent.push({ method: review[1]!, body })
      return json({ ...VISIT, status: 'completed', review: { ...body, text: body.text ?? null, createdAt: Date.now() } })
    })
    return (input, init) => (new Request(input, init).url.includes('/review') ? mine(input, init) : signIn(input, init))
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

/** The api refuses (30 days after the visit): the modal stays with the reason. */
export const Refused: Story = {
  args: { routes: { '/$lang': opener({ rating: 5 }) }, server: reviewApi({ refusal: 'review_window_passed' }) },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await userEvent.click(modal.getByRole('button', { name: 'Send review' }))
    await expect(await modal.findByText('Reviews can be written up to 30 days after the visit.')).toBeVisible()
    await expect(body.getByRole('dialog', { name: 'How was it?' })).toBeVisible()
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
