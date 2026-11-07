/**
 * The appointment booking flow (Booking, book C-12–C-14): the focused header and its steps, the services, the
 * specialist (anyone, the people who do the picked services, nobody who does them all), the time (the strip, the
 * times by part of day, a full day and the way to the next free one), the summary beside it and the phone bar.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addDays, today } from '@yeral/domain/time'
import { expect, userEvent, waitFor, within } from 'storybook/test'
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

/** Step 1: nothing picked and no action; a pick moves straight on to the specialist (#39), the service in the summary. */
export const Services: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByText('No service chosen yet.')).toBeVisible()
    await expect(summary.queryByRole('button', { name: 'Continue' })).toBeNull()
    await expect(canvas.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/en/b/glow-studio')
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Women’s haircut' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a specialist' })).toBeVisible()
    // the service's price and the total; still no action on a single-pick step
    await waitFor(() => expect(summary.getAllByText('80 TMT')).toHaveLength(2))
    await expect(summary.queryByRole('button', { name: 'Continue' })).toBeNull()
    await expect(summary.getByRole('button', { name: 'Clear the booking' })).toBeVisible()
  },
}

/**
 * «Book» on Maral's card (`?staff=&first=staff`, owner's review #39): she's a done first step («Maral · Change»), the
 * flow opens on her services with «See all services» at the list's head, Back is the business page, and Continue goes
 * to the time with no specialist step between; a haircut she doesn't do says so (anyone takes the booking), and
 * taking it off brings her back.
 */
export const WithSpecialist: Story = {
  args: { path: '/en/b/glow-studio/book?staff=st-maral&first=staff' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    const steps = within(canvas.getByRole('navigation', { name: 'Booking steps' }))
    await expect(steps.getByRole('button', { name: 'Specialist' })).toBeEnabled()
    // a step's name is its number and label
    await expect(steps.getByRole('button', { name: '2 Services' })).toHaveAttribute('aria-current', 'step')
    await expect(canvas.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/en/b/glow-studio')
    await expect(canvas.getByRole('button', { name: 'Change the specialist' })).toBeVisible()
    await expect(canvas.getByText(/^Maral does \d+ services?$/)).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Select: Women’s haircut' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Manicure' }))
    // the pick moves on to the time, no specialist step between
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await waitFor(() => expect(summary.getByText('Maral')).toBeVisible())
  },
}

/** The done specialist step opens that choice with her checked; picking her again goes back on to the time. */
export const ChangeSpecialist: Story = {
  args: { path: '/en/b/glow-studio/book?staff=st-maral&first=staff&services=s5&step=time' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    const steps = within(canvas.getByRole('navigation', { name: 'Booking steps' }))
    await userEvent.click(steps.getByRole('button', { name: 'Specialist' }))
    const group = within(await canvas.findByRole('radiogroup', { name: 'Specialist' }))
    await expect(group.getByRole('radio', { name: /Maral/ })).toHaveAttribute('aria-checked', 'true')
    // the choice open again: the step reads as the step, not as done
    await expect(steps.getByRole('button', { name: '1 Specialist' })).toHaveAttribute('aria-current', 'step')
    // the business page keeps nothing picked (Venue v0.7 · C3)
    await expect(canvas.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/en/b/glow-studio')
    await userEvent.click(group.getByRole('radio', { name: /Maral/ }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
  },
}

/**
 * A link with a service and Maral (`?services=&staff=&first=staff&step=time`): the specialist and the services are
 * done, the flow opens on the time; Back is the services, not the business page.
 */
export const WithSpecialistAndService: Story = {
  args: { path: '/en/b/glow-studio/book?services=s5&staff=st-maral&first=staff&step=time' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    const steps = within(canvas.getByRole('navigation', { name: 'Booking steps' }))
    await expect(steps.getByRole('button', { name: 'Specialist' })).toBeEnabled()
    await expect(steps.getByRole('button', { name: 'Services' })).toBeEnabled()
    await expect(steps.getByRole('button', { name: '3 Time' })).toHaveAttribute('aria-current', 'step')
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByText('Maral')).toBeVisible()
    await expect(summary.getByText('Manicure')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/en/b/glow-studio')
  },
}

/**
 * A service picked on the business page that Maral doesn't do, then her «Book» (no `step=`): the services open with
 * the warning, so nobody lands on a time for «any specialist» without knowing why.
 */
export const WithSpecialistNotTheirs: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&staff=st-maral&first=staff' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    await expect(canvas.getByText(/^Maral doesn't do Women’s haircut, so any free specialist takes this booking\./)).toBeVisible()
    // the done step at the top and the summary's specialist row both change her
    await expect(canvas.getAllByRole('button', { name: 'Change the specialist' })).toHaveLength(2)
  },
}

/** Step 2: anyone with the earliest time, the people who do the haircut, the others disabled with why; a pick moves on. */
export const Specialist: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&step=staff' },
  play: async ({ canvas }) => {
    const group = within(await canvas.findByRole('radiogroup', { name: 'Specialist' }))
    await expect(group.getByRole('radio', { name: /Any specialist/ })).toHaveAttribute('aria-checked', 'true')
    await expect(await group.findByText('Earliest free time: Today 15:30')).toBeVisible()
    await expect(group.getByRole('radio', { name: /Maral/ })).toBeDisabled()
    await expect(group.getAllByText("Doesn't do the selected service")).toHaveLength(3)
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.queryByRole('button', { name: 'Continue' })).toBeNull()
    await userEvent.click(group.getByRole('radio', { name: /Aýna/ }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await waitFor(() => expect(summary.getByText('Aýna')).toBeVisible())
    await expect(summary.getByRole('button', { name: 'Change the specialist' })).toBeVisible()
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
    await expect(summary.queryByRole('button', { name: 'Continue' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: '16:00' }))
    await expect(await summary.findByText(/· 16:00–17:00$/)).toBeVisible()
    await waitFor(() => expect(summary.getByRole('button', { name: 'Continue' })).toBeEnabled())
  },
}

/**
 * A second service comes from the summary (C7-Booking C4.4): «Add a service» opens the services, a pick goes back to
 * the time (the specialist is answered), × shows from two services; Clear starts over and Undo puts it all back.
 */
export const AddServiceAndClear: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&staff=any&step=time' },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await expect(summary.queryByRole('button', { name: 'Remove Women’s haircut' })).toBeNull()
    await userEvent.click(summary.getByRole('button', { name: 'Add a service' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Manicure' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await waitFor(() => expect(summary.getByRole('button', { name: 'Remove Manicure' })).toBeVisible())
    await userEvent.click(summary.getByRole('button', { name: 'Clear the booking' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose services' })).toBeVisible()
    await userEvent.click(await within(document.body).findByRole('button', { name: 'Undo' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
    await waitFor(() => expect(summary.getByText('Manicure')).toBeVisible())
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

/** A time the day no longer has (taken since the link was made) counts as not chosen: no Continue yet. */
export const StaleTime: Story = {
  args: { path: `/en/b/glow-studio/book?services=s1&step=time&date=${today()}&time=600` },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await canvas.findByRole('button', { name: '15:30' })).toBeVisible()
    await expect(summary.queryByRole('button', { name: 'Continue' })).toBeNull()
  },
}

/** Phone: «2/4 · Specialist» in the header, the bar with the count and total, no Continue on a single-pick step. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: '/en/b/glow-studio/book?services=s1,s2&step=staff' },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    await expect(bar.getByText('2 services · 140 TMT')).toBeVisible()
    await expect(bar.queryByRole('button', { name: 'Continue' })).toBeNull()
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
    // the number with a «Verified» badge (#50); the booking card with the bigger business block (#51)
    await expect(canvas.getByText('Verified')).toBeVisible()
    const card = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(card.getByRole('heading', { level: 2, name: 'Glow Studio' })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Get directions' })).toBeVisible()
    await expect(card.getByText('Date and time')).toBeVisible()
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

const moved = { address: { was: 'Görogly street 52, 1st floor' }, hours: false, phone: false }

/**
 * The business moved since Aýjemal's last visit (C7-Booking D1, book F-245): the notice leads the booking card, Send
 * booking waits for «I've seen the new address» with one line under it; ticked, it sends.
 */
export const ChangedAddress: Story = {
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, changedSinceLastVisit: moved } }) },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await card.findByText('Glow Studio has moved since your last visit')).toBeVisible()
    await expect(card.getByText('Was: Görogly street 52, 1st floor')).toBeVisible()
    await expect(card.getByRole('button', { name: 'Send booking' })).toBeDisabled()
    await expect(card.getByText('Tick “I’ve seen the new address” to send.')).toBeVisible()
    await userEvent.click(card.getByRole('checkbox', { name: 'I’ve seen the new address' }))
    await waitFor(() => expect(card.getByRole('button', { name: 'Send booking' })).toBeEnabled())
    await expect(card.queryByText('Tick “I’ve seen the new address” to send.')).toBeNull()
    await userEvent.click(card.getByRole('button', { name: 'Send booking' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Booking sent' })).toBeVisible()
  },
}

/** Moved and new hours: one notice with the booking day's hours, one tick; Send booking waits for it. */
export const ChangedAddressAndHours: Story = {
  args: {
    path: confirm,
    server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, changedSinceLastVisit: { ...moved, hours: true } } }),
  },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await card.findByText('Glow Studio has moved and changed its hours')).toBeVisible()
    await expect(card.getAllByRole('checkbox')).toHaveLength(1)
    await expect(card.getByRole('button', { name: 'Send booking' })).toBeDisabled()
  },
}

/** New hours only inform: the notice, and Send booking is on at once. */
export const ChangedHours: Story = {
  args: {
    path: confirm,
    server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, changedSinceLastVisit: { address: null, hours: true, phone: false } } }),
  },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await card.findByText('New hours since your last visit')).toBeVisible()
    await expect(card.queryByRole('checkbox')).toBeNull()
    await waitFor(() => expect(card.getByRole('button', { name: 'Send booking' })).toBeEnabled())
  },
}

/** Nothing changed since the last visit (or no visit): no notice, Send booking on. */
export const ChangedNothing: Story = {
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await waitFor(() => expect(card.getByRole('button', { name: 'Send booking' })).toBeEnabled())
    await expect(card.queryByText(/since your last visit/)).toBeNull()
    await expect(card.queryByRole('checkbox')).toBeNull()
  },
}

/** Signed out nobody's last visit is known: no notice; signing in is what Send booking waits for. */
export const ChangedSignedOut: Story = {
  args: { path: confirm, server: businessApi({ business: { ...GLOW, changedSinceLastVisit: moved } }) },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await expect(await card.findByText('First confirm your phone number.')).toBeVisible()
    await expect(card.queryByText(/since your last visit/)).toBeNull()
    await expect(card.getByRole('button', { name: 'Send booking' })).toBeDisabled()
  },
}

/** Phone: the notice heads the card in the flow; the bar's Send booking waits for the tick. */
export const ChangedAddressPhone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: confirm, server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, changedSinceLastVisit: moved } }) },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    // the card in the flow (the one beside it is hidden under 768)
    const flow = within(canvas.getByRole('main'))
    await expect(await flow.findByText('Glow Studio has moved since your last visit')).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Send booking' })).toBeDisabled()
    await userEvent.click(flow.getByRole('checkbox', { name: 'I’ve seen the new address' }))
    await waitFor(() => expect(bar.getByRole('button', { name: 'Send booking' })).toBeEnabled())
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
