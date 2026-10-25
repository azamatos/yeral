/**
 * The appointment booking flow (Booking, book C-12–C-14): the focused header and its steps, the services, the
 * specialist (anyone, the people who do the picked services, nobody who does them all), the time (the strip, the
 * times by part of day, a full day and the way to the next free one), the summary beside it and the phone bar.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addDays, today } from '@yeral/domain/time'
import { expect, userEvent, within } from 'storybook/test'
import { businessApi, PageStory } from '@/shared/storybook'
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

/** A link to the confirmation without a time opens the time step (the steps hold back to what's chosen). */
export const HeldBack: Story = {
  args: { path: '/en/b/glow-studio/book?services=s1&step=confirm' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Choose a time' })).toBeVisible()
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
  args: { path: `/en/b/glow-studio/book?services=s1&step=time&date=${today()}&time=15:30` },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Your booking' }))
    await expect(await bar.findByText('1 service · 80 TMT · 15:30')).toBeVisible()
  },
}
