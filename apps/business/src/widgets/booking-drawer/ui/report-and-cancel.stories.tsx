/**
 * Report and cancel in the booking drawer — B-Calendar `panel=report-menu | report-noshow | report-added | reported |
 * complaint` and the cancel modal (v0.6 round 3.1, English), B-Mobile 4b; book B-27, B-28, Q-207. The clock stands at
 * Wednesday, 14 October 2026, 11:30: what the Report menu offers before the start, from it and over an earlier report;
 * a no-show, «Other…» in words and a removal with their toasts' Undo; the box by role and age; the cancel with each
 * reason; a phone; the Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Level } from '@yeral/domain/permissions'
import { addDays, epochOf } from '@yeral/domain/time'
import { expect, fn, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { BookingDrawer } from './booking-drawer'
import { AYNA, booking, card, CODE, DAY, fakeApi, MAYSA, NOW, report, type Call } from './booking-drawer.fixtures'

const onClose = fn()
const onMove = fn()

/** The drawer over an empty page, as the calendar opens it; a specialist's own column is Aýna's. */
const drawer =
  (level: Level, extra: { move?: boolean } = {}) =>
  () => (
    <BookingDrawer
      slug="glow-studio"
      code={CODE}
      now={NOW}
      level={level}
      staffId={level === 'specialist' ? AYNA.staffId : undefined}
      onClose={onClose}
      onMove={extra.move ? onMove : undefined}
    />
  )

/** A visit that started at 11:00 today (the clock says 11:30). */
const started = booking({ date: DAY, start: 660, end: 720 })
/** A visit over since 10:00 today: within the 24 hours a no-show may still be marked. */
const ended = booking({ date: DAY, start: 540, end: 600, status: 'completed' })

const meta = {
  title: 'Business/Bookings/ReportAndCancel',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: { '/': drawer('owner') }, path: '/', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const open = () => page.findByRole('dialog', { name: 'Booking' })
const openMenu = async (drawer: HTMLElement) => {
  await userEvent.click(await within(drawer).findByRole('button', { name: 'Report' }))
  return page.findByRole('menu')
}
const items = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((i) => i.textContent)
const toastWith = (text: string) =>
  page.findByText(text, {}, { timeout: 3000 }).then((n) => n.closest('[data-sonner-toast]') as HTMLElement)

/** Before the start (`report-menu`): Rude behaviour and Other…, each with what it does; «Cancel booking» beside. */
export const BeforeStart: Story = {
  play: async () => {
    const drawer = await open()
    const d = within(drawer)
    await expect(await d.findByRole('button', { name: 'Cancel booking' })).toBeVisible()
    const menu = await openMenu(drawer)
    await expect(items(menu)).toEqual(['Rude behaviourThe booking doesn’t change', 'Other…Write what happened'])
    await userEvent.keyboard('{Escape}')
  },
}

/** From the start (`report-noshow`): all four, No-show first; a started visit can't be cancelled or moved any more. */
export const Started: Story = {
  args: { routes: { '/': drawer('owner', { move: true }) }, server: fakeApi({ booking: started }) },
  play: async () => {
    const drawer = await open()
    const d = within(drawer)
    await expect(d.queryByRole('button', { name: 'Cancel booking' })).toBeNull()
    await expect(d.queryByRole('button', { name: 'Move to another time' })).toBeNull()
    const menu = await openMenu(drawer)
    await expect(items(menu)).toEqual([
      'No-showThe booking becomes No-show · counts towards Phone only',
      'Came lateThe booking doesn’t change',
      'Rude behaviourThe booking doesn’t change',
      'Other…Write what happened',
    ])
    await userEvent.keyboard('{Escape}')
  },
}

const noShowCalls: Call[] = []

/**
 * A no-show on a visit that ended: the toast, the booking No-show with the report box in the footer's place; the
 * toast's Undo takes it back and the booking is Completed again.
 */
export const NoShow: Story = {
  args: { server: fakeApi({ booking: ended, calls: noShowCalls }) },
  play: async ({ canvas }) => {
    noShowCalls.length = 0
    const drawer = await open()
    const d = within(drawer)
    const menu = await openMenu(drawer)
    await userEvent.click(within(menu).getByRole('menuitem', { name: /No-show/ }))
    const saved = await toastWith('Marked as No-show · saved to the client’s card')
    await expect(noShowCalls).toEqual([{ route: `POST /w/glow-studio/bookings/${CODE}/complaint`, body: { type: 'noshow' } }])
    await expect(await d.findByText('No-show · Today · 11:30 · Maýsa Annaýewa')).toBeVisible()
    await expect(d.getByText('The client isn’t told. You can remove it until 21 October.')).toBeVisible()
    await expect(d.queryByRole('button', { name: 'Report' })).toBeNull()
    await userEvent.click(within(saved).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(d.queryByText('No-show · Today · 11:30 · Maýsa Annaýewa')).toBeNull())
    await expect(noShowCalls[1]).toEqual({ route: `DELETE /w/glow-studio/bookings/${CODE}/complaint`, body: null })
    await expect(await d.findByRole('button', { name: 'Report' })).toBeVisible()
    await expect(canvas.queryByText('Report removed')).toBeNull()
  },
}

const otherCalls: Call[] = []

/** «Other…» asks «What happened?» (`panel=complaint`): Save waits for words; saved, the box carries them. */
export const Other: Story = {
  args: { server: fakeApi({ calls: otherCalls }) },
  play: async () => {
    otherCalls.length = 0
    const drawer = await open()
    const d = within(drawer)
    const menu = await openMenu(drawer)
    await userEvent.click(within(menu).getByRole('menuitem', { name: /Other/ }))
    const form = within(await page.findByRole('dialog', { name: 'What happened?' }))
    // the modal pops in: its words are visible once the animation is through
    await waitFor(() => expect(form.getByText('Gözel Annaýewa · Women’s haircut · Thursday, 15 October · 10:00–11:00')).toBeVisible())
    await expect(form.getByText('Saved to the client’s card; only the team sees it. Only no-shows count towards Phone only.')).toBeVisible()
    const save = form.getByRole('button', { name: 'Save' })
    await expect(save).toBeDisabled()
    await userEvent.type(form.getByRole('textbox', { name: 'What happened, in a few words' }), 'Brought a friend without booking')
    await userEvent.click(save)
    await toastWith('Report saved to the client’s card')
    await expect(otherCalls).toEqual([
      { route: `POST /w/glow-studio/bookings/${CODE}/complaint`, body: { type: 'other', text: 'Brought a friend without booking' } },
    ])
    await waitFor(() => expect(page.queryByRole('dialog', { name: 'What happened?' })).toBeNull())
    await expect(await d.findByText('Other · Brought a friend without booking · Today · 11:30 · Maýsa Annaýewa')).toBeVisible()
    // one report per booking: before the start nothing else may be added (a no-show from the start, replacing it)
    await waitFor(() => expect(d.queryByRole('button', { name: 'Report' })).toBeNull())
  },
}

/** An earlier «Came late» (`report-added`): the box with «Remove report», and the menu offers only No-show, which replaces it. */
export const ReportAdded: Story = {
  args: { server: fakeApi({ booking: booking({ ...ended, complaint: report('late') }) }) },
  play: async () => {
    const drawer = await open()
    const d = within(drawer)
    await expect(await d.findByText('Came late · Today · 11:15 · Maýsa Annaýewa')).toBeVisible()
    await expect(d.getByRole('button', { name: 'Remove report: Came late' })).toBeVisible()
    const menu = await openMenu(drawer)
    await expect(items(menu)).toEqual(['No-showReplaces the earlier report · the booking becomes No-show'])
    await userEvent.keyboard('{Escape}')
  },
}

const removeCalls: Call[] = []

/**
 * A no-show marked yesterday (`reported`, B-Mobile 4b): no Report button, the box alone; «Remove report» puts the
 * booking back to Completed (the toast says so; its Undo marks the no-show again).
 */
export const Reported: Story = {
  args: {
    server: fakeApi({
      booking: booking({ date: addDays(DAY, -1), status: 'noshow', complaint: report('noshow', { at: epochOf(addDays(DAY, -1), 665) }) }),
      card: card({}, { noShows: 2 }),
      calls: removeCalls,
    }),
  },
  play: async () => {
    removeCalls.length = 0
    const drawer = await open()
    const d = within(drawer)
    await expect(await d.findByText('No-show · 13 October · 11:05 · Maýsa Annaýewa')).toBeVisible()
    await expect(d.getByText('The client isn’t told. You can remove it until 20 October.')).toBeVisible()
    await expect(d.queryByRole('button', { name: 'Report' })).toBeNull()
    await userEvent.click(d.getByRole('button', { name: 'Remove report: No-show' }))
    const removed = await toastWith('Report removed · the booking is Completed again')
    await expect(removeCalls).toEqual([{ route: `DELETE /w/glow-studio/bookings/${CODE}/complaint`, body: null }])
    // the badge says Completed («Completed» is also in the visits' rows, which are list items)
    await waitFor(() => expect(d.getAllByText('Completed').filter((n) => !n.closest('li'))).toHaveLength(1))
    await userEvent.click(within(removed).getByRole('button', { name: 'Undo' }))
    await expect(await d.findByText('No-show · Today · 11:30 · Maýsa Annaýewa')).toBeVisible()
    await expect(removeCalls[1]).toEqual({ route: `POST /w/glow-studio/bookings/${CODE}/complaint`, body: { type: 'noshow' } })
  },
}

/** A report older than 7 days on a visit long over: nothing to remove, nothing left to report, so no footer. */
export const Locked: Story = {
  args: {
    server: fakeApi({
      booking: booking({ date: addDays(DAY, -8), status: 'completed', complaint: report('rude', { at: epochOf(addDays(DAY, -8), 675) }) }),
    }),
  },
  play: async () => {
    const drawer = await open()
    const d = within(drawer)
    await expect(await d.findByText('Rude behaviour · 6 October · 11:15 · Maýsa Annaýewa')).toBeVisible()
    await expect(d.getByText('The client isn’t told.')).toBeVisible()
    await expect(d.queryByRole('button', { name: /Remove report/ })).toBeNull()
    await expect(d.queryByRole('button', { name: 'Report' })).toBeNull()
  },
}

/** A specialist removes the report she filed herself. */
export const SpecialistOwnReport: Story = {
  args: {
    routes: { '/': drawer('specialist') },
    server: fakeApi({ booking: booking({ ...ended, complaint: report('late', { by: AYNA }) }) }),
  },
  play: async () => {
    const drawer = await open()
    const d = within(drawer)
    await expect(await d.findByText('Came late · Today · 11:15 · Aýna')).toBeVisible()
    await expect(d.getByRole('button', { name: 'Remove report: Came late' })).toBeVisible()
  },
}

/** A specialist reads the owner's report on her booking, but can't remove it. */
export const SpecialistColleaguesReport: Story = {
  args: {
    routes: { '/': drawer('specialist') },
    server: fakeApi({ booking: booking({ ...ended, complaint: report('late', { by: MAYSA }) }) }),
  },
  play: async () => {
    const drawer = await open()
    const d = within(drawer)
    await expect(await d.findByText('Came late · Today · 11:15 · Maýsa Annaýewa')).toBeVisible()
    await expect(d.queryByRole('button', { name: /Remove report/ })).toBeNull()
    await expect(d.getByText('The client isn’t told.')).toBeVisible()
  },
}

const cancelCalls: Call[] = []

/**
 * «Cancel the booking»: the reason as a chip, «Another reason» in words the client sees; the danger button; the
 * toast, and the drawer closes.
 */
export const CancelBooking: Story = {
  args: { server: fakeApi({ calls: cancelCalls }) },
  play: async () => {
    cancelCalls.length = 0
    onClose.mockClear()
    const drawer = await open()
    const d = within(drawer)
    await userEvent.click(await d.findByRole('button', { name: 'Cancel booking' }))
    const modal = within(await page.findByRole('dialog', { name: 'Cancel the booking' }))
    await waitFor(() => expect(modal.getByText('The client is notified and sees the reason in My bookings.')).toBeVisible())
    await expect(modal.getByText('Gözel Annaýewa · Women’s haircut · Thursday, 15 October · 10:00–11:00')).toBeVisible()
    await expect(modal.getAllByRole('radio').map((r) => r.textContent)).toEqual([
      'The client called to cancel',
      'The specialist can’t come in',
      'Another reason',
    ])
    const confirm = modal.getByRole('button', { name: 'Cancel booking' })
    await expect(confirm).toBeDisabled()
    await userEvent.click(modal.getByRole('radio', { name: 'Another reason' }))
    await expect(confirm).toBeDisabled()
    await userEvent.type(modal.getByRole('textbox', { name: 'Reason in a few words' }), 'The salon is closed for repairs')
    await userEvent.click(confirm)
    await toastWith('Booking cancelled · the client is notified')
    await expect(cancelCalls).toEqual([
      { route: `POST /w/glow-studio/bookings/${CODE}/cancel`, body: { reason: 'other', text: 'The salon is closed for repairs' } },
    ])
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  },
}

const clientCalls: Call[] = []

/** «The client called to cancel» is the client's own cancel: the reason alone, no words. */
export const CancelClientCalled: Story = {
  args: { server: fakeApi({ calls: clientCalls }) },
  play: async () => {
    clientCalls.length = 0
    const drawer = await open()
    const d = within(drawer)
    await userEvent.click(await d.findByRole('button', { name: 'Cancel booking' }))
    const modal = within(await page.findByRole('dialog', { name: 'Cancel the booking' }))
    await userEvent.click(modal.getByRole('radio', { name: 'The client called to cancel' }))
    await userEvent.click(modal.getByRole('button', { name: 'Cancel booking' }))
    // the story before may have left a toast with the same words: what the api was sent tells
    await waitFor(() =>
      expect(clientCalls).toEqual([{ route: `POST /w/glow-studio/bookings/${CODE}/cancel`, body: { reason: 'client_called' } }]),
    )
    await expect((await page.findAllByText('Booking cancelled · the client is notified')).length).toBeGreaterThan(0)
  },
}

/** On a phone the drawer is a sheet; the Report menu opens over its footer. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: fakeApi({ booking: started }) },
  play: async () => {
    const menu = await openMenu(await open())
    await expect(items(menu)).toHaveLength(4)
    await userEvent.keyboard('{Escape}')
  },
}

/** The words about a third longer (Russian): the three don't fit one line, so «Cancel booking» goes to its own, on the right. */
export const RussianLength: Story = {
  globals: { text: 'longer' },
  args: { routes: { '/': drawer('owner', { move: true }) } },
  play: async () => {
    const d = within(await page.findByRole('dialog'))
    await expect(await d.findByRole('button', { name: /Cancel booking/ })).toBeVisible()
    await expect(d.getAllByRole('button', { name: /Cancel booking|Report|Move to another time/ })).toHaveLength(3)
  },
}
