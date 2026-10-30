/**
 * Move mode (Booking `mode=move`, book C-30): a confirmed haircut with Aýna tomorrow at 14:30 changes its time — the
 * services locked, Aýna «Current», the own time marked and out of the choice, the previous and the new time with the
 * business's rules, «Ask for the new time» and its sent page; a business that changes it at once, with «Add to
 * calendar»; a time taken meanwhile; a booking that can't move (a declined request; a service gone from the menu);
 * the booking's specialist no longer doing its services; the phone. The free times come from the booking's own
 * services (`moveApi` refuses a read asking neither `services` nor `move`).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addDays, today } from '@yeral/domain/time'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { GLOW, moveApi, PageStory } from '@/shared/storybook'
import { BookingFlow } from './booking-flow'

const routes = {
  '/$lang/b/$slug': () => <p>Business page</p>,
  '/$lang/b/$slug/book': BookingFlow,
  '/$lang/account/bookings/{-$code}': () => <p>My bookings</p>,
}
// YR-48190 is Glow Studio's, confirmed, tomorrow 14:30–15:30 with Aýna; without the move it has waiting
const server = moveApi({ details: { 'YR-48190': { reschedule: null } } })
const tomorrow = addDays(today(), 1)

const meta = {
  title: 'Client/Pages/BookingMove',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes, path: '/en/b/glow-studio/book?move=YR-48190', server },
  globals: { viewport: { value: 'xl' } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The specialist step: the services locked, Aýna chosen and «Current»; Continue goes to the new time. */
export const Specialist: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Change the time' })).toBeVisible()
    await expect(canvas.getByText('YR-48190')).toBeVisible()
    await expect(canvas.getAllByText('To change services, cancel the booking and book again.')[0]).toBeVisible()
    const group = within(canvas.getByRole('radiogroup', { name: 'Specialist' }))
    await expect(group.getByRole('radio', { name: /Aýna/ })).toHaveAttribute('aria-checked', 'true')
    await expect(group.getByText('Current')).toBeVisible()
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByText(/^Previous time: /)).toBeVisible()
    await userEvent.click(summary.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Choose the new time' })).toBeVisible()
  },
}

/**
 * The new time: 14:30 is the booking's own, marked; 16:00 asked for, the confirmation with the business's rules (the
 * free change window and lateness, no «Pay at the place»: the move changes nothing about it), the request sent, the
 * old time kept and nothing to add to a calendar yet.
 */
export const AskForTheNewTime: Story = {
  args: { path: `/en/b/glow-studio/book?move=YR-48190&step=time&date=${tomorrow}` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: '14:30, your previous time' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: '16:00' }))
    const summary = within(canvas.getByRole('complementary', { name: 'Your booking' }))
    await expect(summary.getByText(/^New time: /)).toBeVisible()
    await userEvent.click(summary.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Confirm the new time' })).toBeVisible()
    await expect(canvas.getByText('Previous time')).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 2, name: 'Booking rules' })).toBeVisible()
    await expect(canvas.getByText('You can cancel or change the booking for free up to 2 h before.')).toBeVisible()
    await expect(canvas.getByText("If you're more than 15 min late, the booking may be cancelled.")).toBeVisible()
    await expect(canvas.queryByText('Pay at the place.')).toBeNull()
    await userEvent.click(summary.getByRole('button', { name: 'Request the new time' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Move request sent' })).toBeVisible()
    await expect(canvas.getByText(/^New time requested: .* · waiting for an answer$/)).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Go to my bookings' })).toHaveAttribute('href', '/en/account/bookings/YR-48190')
    await expect(canvas.queryByRole('button', { name: 'Add to calendar' })).toBeNull()
  },
}

/**
 * A business that confirms at once: «Change the time», then «Time changed» with the previous time struck through and
 * «Add to calendar» with the new time.
 */
export const ChangeAtOnce: Story = {
  args: {
    path: `/en/b/glow-studio/book?move=YR-48190&step=confirm&date=${tomorrow}&time=960`,
    server: moveApi({
      details: { 'YR-48190': { reschedule: null } },
      instant: true,
      business: { business: { ...GLOW, confirmMode: 'instant' } },
    }),
  },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await userEvent.click(await summary.findByRole('button', { name: 'Change the time' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Time changed' })).toBeVisible()
    await expect(canvas.getByText('Previous time')).toBeVisible()
    await expect(canvas.queryByText(/waiting for an answer/)).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Add to calendar' }))
    await expect(await canvas.findByText('The calendar file (.ics) is downloaded.')).toBeVisible()
  },
}

/** A service of the booking left the menu meanwhile: the first free-times read says it can't move online, before the time step. */
export const CantMoveOnline: Story = {
  args: { server: moveApi({ details: { 'YR-48190': { reschedule: null } }, business: { moveRead: 'not_bookable' } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("This booking can't be moved online.")).toBeVisible()
    await expect(canvas.getByText(/A service of this booking is no longer booked online/)).toBeVisible()
    await expect(canvas.queryByRole('radiogroup', { name: 'Specialist' })).toBeNull()
    await expect(canvas.getByRole('link', { name: 'Go to my bookings' })).toHaveAttribute('href', '/en/account/bookings')
  },
}

/** Aýna no longer does the haircut: the api won't swap her, so the move asks for any specialist and says so. */
export const SpecialistGone: Story = {
  args: { server: moveApi({ details: { 'YR-48190': { reschedule: null } }, business: { moveRead: { staffGone: 'st-ayna' } } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radiogroup', { name: 'Specialist' })).toBeVisible()
    // the address changes to anyone (the step renders again: ask for the group afresh)
    const group = () => within(canvas.getByRole('radiogroup', { name: 'Specialist' }))
    await waitFor(() => expect(group().getByRole('radio', { name: /Any specialist/ })).toHaveAttribute('aria-checked', 'true'))
    await expect(group().getByText('Current')).toBeVisible()
    const toast = await within(document.body).findByText('Aýna no longer does these services. The new time is with any specialist.')
    await waitFor(() => expect(toast).toBeVisible())
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Choose the new time' })).toBeVisible()
    await expect(within(canvas.getByRole('complementary', { name: 'Your booking' })).getByText('Any specialist')).toBeVisible()
  },
}

/** Someone took the new time a moment before: the toast says so and the time step opens again. */
export const TimeTaken: Story = {
  args: {
    path: `/en/b/glow-studio/book?move=YR-48190&step=confirm&date=${tomorrow}&time=960`,
    server: moveApi({ details: { 'YR-48190': { reschedule: null } }, refuse: 'slot_taken' }),
  },
  play: async ({ canvas }) => {
    const summary = within(await canvas.findByRole('complementary', { name: 'Your booking' }))
    await userEvent.click(await summary.findByRole('button', { name: 'Request the new time' }))
    const toast = await within(document.body).findByText('This time was just taken. Pick another one.')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Choose the new time' })).toBeVisible()
  },
}

/** A booking that can't move here (a declined request): says so, with the way back to My bookings. */
export const CantMove: Story = {
  args: { path: '/en/b/glow-studio/book?move=YR-48230' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("This booking can't be moved online.")).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Go to my bookings' })).toHaveAttribute('href', '/en/account/bookings')
  },
}

/** Phone: the summary is the bar under the step. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    await expect(bar.getByText(/^Previous time: /)).toBeVisible()
  },
}
