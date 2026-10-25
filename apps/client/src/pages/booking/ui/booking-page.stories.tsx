/**
 * The appointment booking flow (Booking, book C-12–C-14): the focused header and its steps, the services, the
 * specialist (anyone, the people who do the picked services, nobody who does them all), the time (the strip, the
 * times by part of day, a full day and the way to the next free one), the summary beside it and the phone bar.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addDays, today } from '@yeral/domain/time'
import { expect, userEvent, within } from 'storybook/test'
import { AYJEMAL, businessApi, GLOW, PageStory } from '@/shared/storybook'
import { BookingPage } from './booking-page'

const routes = {
  '/$lang/b/$slug': () => <p>Business page</p>,
  '/$lang/b/$slug/book': BookingPage,
}

const meta = {
  title: 'Client/Pages/Booking',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes, path: '/en/b/glow-studio/book', server: businessApi() },
  // the summary sits beside the steps from 1024; the phone stories set their own width
  globals: { viewport: { value: 'xl' } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Step 1: nothing picked, Continue waits; a pick fills the summary and Continue opens the specialist step. */
export const Services: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByText('No service chosen yet.')).toBeVisible()
    await expect(summary.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await expect(summary.getByText('Choose at least one service.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/en/b/glow-studio')
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Women’s haircut' }))
    // the service's price and the total
    await expect(summary.getAllByText('80 TMT')).toHaveLength(2)
    await userEvent.click(summary.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a specialist' })).toBeVisible()
  },
}

/**
 * «Book» on Maral's card: only her services, «See all services» for the rest; a haircut she doesn't do says so (anyone
 * takes the booking), and taking it off brings her back.
 */
export const WithSpecialist: Story = {
  args: { path: '/en/b/glow-studio/book?staff=st-maral' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The services Maral does')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Select: Manicure' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Select: Women’s haircut' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Manicure' }))
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await userEvent.click(canvas.getByRole('button', { name: 'See all services' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Women’s haircut' }))
    await expect(await canvas.findByText(/^Maral doesn't do Women’s haircut, so any free specialist takes this booking\./)).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Selected: Women’s haircut' }))
    await expect(await canvas.findByRole('button', { name: "Only Maral's" })).toBeVisible()
    await userEvent.click(summary.getByRole('button', { name: 'Continue' }))
    const group = within(await canvas.findByRole('radiogroup', { name: 'Specialist' }))
    await expect(group.getByRole('radio', { name: /Maral/ })).toHaveAttribute('aria-checked', 'true')
  },
}

/** Step 2: anyone with the earliest time, the people who do the haircut, the others disabled with why. */
export const Specialist: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&step=staff' },
  play: async ({ canvas }) => {
    const group = within(await canvas.findByRole('radiogroup', { name: 'Specialist' }))
    await expect(group.getByRole('radio', { name: /Any specialist/ })).toHaveAttribute('aria-checked', 'true')
    await expect(await group.findByText('Earliest free time: Today 15:30')).toBeVisible()
    await expect(group.getByRole('radio', { name: /Maral/ })).toBeDisabled()
    await expect(group.getAllByText("Doesn't do the selected service")).toHaveLength(3)
    await userEvent.click(group.getByRole('radio', { name: /Aýna/ }))
    await expect(group.getByRole('radio', { name: /Aýna/ })).toHaveAttribute('aria-checked', 'true')
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByText('Aýna')).toBeVisible()
  },
}

/** Step 2 with a haircut and a manicure: nobody does both, so anyone it is, a free specialist for each. */
export const NoOneDoesAll: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1,s5&step=staff' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No one specialist does all the selected services/)).toBeVisible()
    await expect(canvas.getByRole('radio', { name: /Aýna/ })).toBeDisabled()
  },
}

/** Step 3: the strip, today's times from 15:30 by part of day; a pick names the time in the summary. */
export const Time: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&step=time' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await expect(await canvas.findByText(/^Today · /)).toBeVisible()
    await expect(canvas.getByText('Afternoon')).toBeVisible()
    await expect(canvas.queryByText('Morning')).toBeNull()
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: '16:00' }))
    await expect(await summary.findByText(/· 16:00–17:00$/)).toBeVisible()
    await expect(summary.getByRole('button', { name: 'Continue' })).toBeEnabled()
  },
}

/** A full day: no time, and the button to the next free day. */
export const FullDay: Story = {
  args: { path: `/en/b/glow-studio/book?services=s1&step=time&date=${addDays(today(), 2)}` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No free time on this day')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /^Next free day:/ }))
    await expect(await canvas.findByText('Morning')).toBeVisible()
  },
}

/**
 * A link to the confirmation without a time opens the time step (the steps hold back to what's chosen), and a pick
 * there stays on it: Continue goes on.
 */
export const HeldBack: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&step=confirm' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await userEvent.click(await canvas.findByRole('button', { name: '16:00' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: '16:00' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** A time the day no longer has (taken since the link was made) counts as not chosen: Continue waits. */
export const StaleTime: Story = {
  args: { path: `/en/b/glow-studio/book?services=s1&step=time&date=${today()}&time=600` },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await canvas.findByRole('button', { name: '15:30' })).toBeVisible()
    await expect(summary.getByRole('button', { name: 'Continue' })).toBeDisabled()
  },
}

/** Phone: «2/4 · Specialist» in the header, the bar with the count, total and Continue. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: '/en/b/glow-studio/book?services=s1,s2&step=staff' },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    await expect(bar.getByText('2 services · 140 TMT')).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Continue' })).toBeEnabled()
  },
}

/** Phone, the time step: the strip scrolls, the bar names the chosen time. */
export const PhoneTime: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: `/en/b/glow-studio/book?services=s1&step=time&date=${today()}&time=930` },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    await expect(await bar.findByText('1 service · 80 TMT · 15:30')).toBeVisible()
  },
}

const confirm = `/en/b/glow-studio/book?services=s1&staff=st-ayna&step=confirm&date=${today()}&time=930`

/** Step 4 signed out: «Confirm your number» opens the login; Send booking waits for it. */
export const ConfirmSignedOut: Story = {
  args: { path: confirm },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Confirm your booking' })).toBeVisible()
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByRole('button', { name: 'Send booking' })).toBeDisabled()
    await expect(summary.getByText('First confirm your phone number.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Confirm your number' })).toBeVisible()
    await expect(canvas.getByText(/up to 2 h before/)).toBeVisible()
  },
}

/** Step 4 signed in: who books, a note, Send booking → the sent page, Pending, the code, what happens next. */
export const ConfirmAndSend: Story = {
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Aýjemal Gurbanowa')).toBeVisible()
    await userEvent.type(canvas.getByRole('textbox', { name: /Note for the business/ }), 'Long hair')
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByRole('button', { name: 'Send booking' })).toBeEnabled()
    await userEvent.click(summary.getByRole('button', { name: 'Send booking' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Booking sent' })).toBeVisible()
    await expect(canvas.getByText('Pending')).toBeVisible()
    await expect(canvas.getByText('YR-48213')).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'What happens next?' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Add to calendar' }))
    await expect(await canvas.findByText('The calendar file (.ics) is downloaded.')).toBeVisible()
  },
}

/** An instant business: «Booking confirmed», nobody waits. */
export const SentInstant: Story = {
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, confirmMode: 'instant' } }) },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await userEvent.click(await summary.findByRole('button', { name: 'Send booking' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Booking confirmed' })).toBeVisible()
    await expect(canvas.getByText('Confirmed')).toBeVisible()
  },
}

/** The time was taken meanwhile (Booking `slotTaken`): the nearest free times; one tap and it sends. */
export const SlotTaken: Story = {
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL, taken: 930 }) },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await userEvent.click(await summary.findByRole('button', { name: 'Send booking' }))
    const alert = within(await canvas.findByRole('alert'))
    await expect(alert.getByText('This time was just taken. Free times nearby:')).toBeVisible()
    // the taken time can't be sent again: a new one first
    await expect(summary.getByRole('button', { name: 'Send booking' })).toBeDisabled()
    await expect(summary.getByText('First choose a new time.')).toBeVisible()
    await userEvent.click(alert.getByRole('button', { name: 'Choose 16:00' }))
    await expect(canvas.queryByRole('alert')).toBeNull()
    await expect(await summary.findByText(/· 16:00–17:00$/)).toBeVisible()
    await userEvent.click(summary.getByRole('button', { name: 'Send booking' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Booking sent' })).toBeVisible()
  },
}

/** Phone, step 4: the summary in the flow and Send booking in the bar. */
export const ConfirmPhone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    await expect(await bar.findByRole('button', { name: 'Send booking' })).toBeEnabled()
  },
}

/** The sent page for a booking it can't read (signed out since, another person's): it says so and opens My bookings. */
export const SentUnreadable: Story = {
  args: { path: '/en/b/glow-studio/book?sent=YR-99999', server: businessApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/This booking can't be shown here/)).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Go to my bookings' })).toBeVisible()
  },
}
