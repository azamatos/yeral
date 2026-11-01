/**
 * Block time — B-Calendar `panel=block-time | block-error`, B-Mobile 2c (v0.6 round 2, English), DS-Business
 * BlockTimeModal: the person, the day and From–To, the reason chips (Other in words), the repeat with Until and its
 * caption, the booking in the way with «Open the booking», a specialist's own time read-only, the phone sheet.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addDays, today } from '@yeral/domain/time'
import { useState } from 'react'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { BlockTimeModal } from './block-time-modal'

const now = Date.now()
const TOMORROW = addDays(today(now), 1)
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const people = [
  { staffId: id(1), name: 'Aýna' },
  { staffId: id(2), name: 'Maral' },
  { staffId: id(3), name: 'Jeren' },
]
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api's answer to a block: saved, or refused over Ejegyz T.'s booking (`block_over_bookings`). */
const fakeApi =
  (over = false) =>
  (): typeof fetch =>
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
    if (route === 'POST /w/glow-studio/calendar/blocks') {
      const body = (await request.json()) as { staffId: string; date: string; start: number; end: number }
      if (over)
        return json(
          { error: { code: 'block_over_bookings', details: { bookings: [{ code: 'YR-48101', date: body.date, start: 930, end: 990 }] } } },
          409,
        )
      return json({ items: [{ id: id(9), ...body, kind: 'training', reason: null, seriesId: null }] })
    }
    return json({ error: { code: 'not_found' } }, 404)
  }

/** The modal open from tomorrow's 14:30 slot, as the calendar opens it; what it asked the page is written under it. */
const harness = ({ specialist = false, start = 870, date = TOMORROW }: { specialist?: boolean; start?: number; date?: string } = {}) =>
  function Harness() {
    const [asked, setAsked] = useState<string[]>([])
    return (
      <>
        <BlockTimeModal
          slug="glow-studio"
          slot={{ staffId: id(2), date, start }}
          people={specialist ? [people[1]!] : people}
          specialist={specialist}
          hours={{ from: 8, to: 21 }}
          today={today(now)}
          now={now}
          bookings={[{ code: 'YR-48101', client: { name: 'Ejegyz T.' }, items: [{ service: 'Women’s haircut' }] }]}
          onOpenBooking={(code) => setAsked((a) => [...a, `opened ${code}`])}
          onClose={() => setAsked((a) => [...a, 'closed'])}
        />
        <p data-testid="asked">{asked.join(', ')}</p>
      </>
    )
  }

const meta = {
  title: 'Business/Calendar/BlockTimeModal',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/': harness() }, path: '/', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The modal once it's popped in (its first frame is transparent). */
const dialog = async () => {
  const el = await page.findByRole('dialog', { name: 'Block time' })
  await waitFor(() => expect(el).toBeVisible())
  return within(el)
}
/** What the modal asked the page: `closed`, `opened YR-…`. */
const asked = () => page.getByTestId('asked')

/** Maral, tomorrow 14:30–15:30; the reason chips, Other asks for words; Block time only once there's a reason. */
export const Default: Story = {
  play: async () => {
    const d = await dialog()
    await expect(d.getByRole('combobox', { name: 'Person' })).toHaveValue(id(2))
    await expect(d.getByRole('button', { name: /^Date and time / })).toBeVisible()
    await expect(d.getByRole('combobox', { name: 'From' })).toHaveValue('870')
    await expect(d.getByRole('combobox', { name: 'To' })).toHaveValue('930')
    const submit = d.getByRole('button', { name: 'Block time' })
    await expect(submit).toBeDisabled()
    await userEvent.click(d.getByRole('radio', { name: 'Other' }))
    const words = d.getByRole('textbox', { name: 'Reason in a few words' })
    await expect(words).toHaveAttribute('placeholder', 'For example: Doctor’s appointment')
    await expect(submit).toBeDisabled()
    await userEvent.type(words, 'Dentist')
    await expect(submit).toBeEnabled()
    // From moved past To: To follows
    await userEvent.selectOptions(d.getByRole('combobox', { name: 'From' }), '960')
    await expect(d.getByRole('combobox', { name: 'To' })).toHaveValue('975')
    await userEvent.click(submit)
    await expect(await page.findByText('Time blocked: Maral · 16:00–16:15 · Dentist')).toBeInTheDocument()
    await expect(asked()).toHaveTextContent('closed')
  },
}

/** Every week until a day: the caption counts the times; every day counts them too. */
export const Repeat: Story = {
  play: async () => {
    const d = await dialog()
    await userEvent.click(d.getByRole('radio', { name: 'Training' }))
    await expect(d.queryByRole('button', { name: /^Until / })).toBeNull()
    await userEvent.click(d.getByRole('radio', { name: 'Every week' }))
    await expect(d.getByRole('button', { name: /^Until / })).toBeVisible()
    await expect(d.getByText(/^Every \w+ from .+ to .+ · 5 times$/)).toBeVisible()
    await userEvent.click(d.getByRole('radio', { name: 'Every day' }))
    await expect(d.getByText(/^Every day from .+ to .+ · 29 times$/)).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Block time' }))
    await expect(await page.findByText(/^Time blocked: Maral · 14:30–15:30 · Training · every day until /)).toBeInTheDocument()
  },
}

/** The api refuses over a booking: named under the times, Block time off, «Open the booking». */
export const Overlap: Story = {
  args: { server: fakeApi(true) },
  play: async () => {
    const d = await dialog()
    await userEvent.click(d.getByRole('radio', { name: 'Break' }))
    await userEvent.click(d.getByRole('button', { name: 'Block time' }))
    const alert = await d.findByRole('alert')
    await expect(alert).toHaveTextContent(
      'This time has a booking: 15:30–16:30 Ejegyz T. · Women’s haircut. Pick another time or move the booking first.',
    )
    await expect(d.getByRole('button', { name: 'Block time' })).toBeDisabled()
    // another time clears it
    await userEvent.selectOptions(d.getByRole('combobox', { name: 'To' }), '900')
    await expect(d.queryByRole('alert')).toBeNull()
    await userEvent.click(d.getByRole('button', { name: 'Block time' }))
    await userEvent.click(within(await d.findByRole('alert')).getByRole('button', { name: 'Open the booking' }))
    await expect(asked()).toHaveTextContent('closed, opened YR-48101')
  },
}

/** A time gone by (yesterday at 08:00), and the end before the start. */
export const Problems: Story = {
  args: { routes: { '/': harness({ date: addDays(today(now), -1), start: 480 }) } },
  play: async () => {
    const d = await dialog()
    await expect(d.getByRole('alert')).toHaveTextContent(/^This time has passed — pick a time from \d\d:\d\d\.$/)
    await userEvent.selectOptions(d.getByRole('combobox', { name: 'From' }), '1200')
    await userEvent.selectOptions(d.getByRole('combobox', { name: 'To' }), '1185')
    await expect(d.getByRole('alert')).toHaveTextContent('The end must be after the start.')
  },
}

/** A specialist: their own name read-only with the hint. */
export const SpecialistSelf: Story = {
  args: { routes: { '/': harness({ specialist: true }) } },
  play: async () => {
    const d = await dialog()
    await expect(d.queryByRole('combobox', { name: 'Person' })).toBeNull()
    await expect(d.getByRole('textbox', { name: 'Person' })).toHaveValue('Maral')
    await expect(d.getByText('You can block only your own time.')).toBeVisible()
  },
}

/** The sheet at 390 (B-Mobile 2c): 44 chips, the repeat across the width, Cancel · Block time. */
export const Sheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async () => {
    const d = await dialog()
    await userEvent.click(d.getByRole('radio', { name: 'Personal' }))
    await userEvent.click(d.getByRole('radio', { name: 'Every week' }))
    await expect(d.getByRole('button', { name: /^Until / })).toBeVisible()
  },
}
