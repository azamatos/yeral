/**
 * DatePicker — DS-Components → «Pickers» (the month), on react-day-picker (rule 10a); the field opens it in a popover
 * (B-Settings special days). Stories are the component's tests: one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ComponentProps } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Field } from '../field'
import { Modal, ModalContent, ModalHeader } from '../modal'
import { DatePicker, type DatePickerCopy, type DateRange } from './date-picker'

const today = '2026-10-14'
const at = (date: string) => new Date(`${date}T12:00:00Z`)
const say = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(at(date))
/** The words the app gives through its formatters; English here. */
const copy: DatePickerCopy = {
  lang: 'en',
  month: say({ month: 'long', year: 'numeric' }),
  weekday: (date) => say({ weekday: 'short' })(date).slice(0, 2),
  weekdayName: say({ weekday: 'long' }),
  day: (date) => `${say({ weekday: 'long' })(date)}, ${say({ day: 'numeric', month: 'long' })(date)}`,
  value: say({ day: 'numeric', month: 'long', year: 'numeric' }),
  range: ({ from, to }) =>
    `${say({ day: 'numeric', month: 'short' })(from)} – ${say({ day: 'numeric', month: 'short', year: 'numeric' })(to)}`,
  placeholder: 'Pick a date',
  prev: 'Previous month',
  next: 'Next month',
}

function Single({
  initial,
  ...props
}: { initial: string | null } & Omit<ComponentProps<typeof DatePicker>, 'mode' | 'value' | 'onValueChange' | 'copy'>) {
  const [value, setValue] = useState(initial)
  return (
    <Field label="Date" className="w-72">
      <DatePicker {...props} copy={copy} value={value} onValueChange={setValue} />
    </Field>
  )
}

/** A range with Sundays that can't be picked. */
function RangedNoSundays() {
  const [value, setValue] = useState<DateRange | null>(null)
  return (
    <Field label="Dates" className="w-72">
      <DatePicker
        mode="range"
        today={today}
        copy={copy}
        isDisabled={(date) => at(date).getUTCDay() === 0}
        value={value}
        onValueChange={setValue}
      />
    </Field>
  )
}

function Ranged({ initial }: { initial: DateRange | null }) {
  const [value, setValue] = useState(initial)
  return (
    <Field label="Dates" className="w-72">
      <DatePicker mode="range" today={today} min={today} copy={copy} value={value} onValueChange={setValue} />
    </Field>
  )
}

const meta = {
  title: 'Inputs/DatePicker',
  component: Single,
  parameters: { layout: 'padded' },
  args: { initial: '2026-11-02', today },
} satisfies Meta<typeof Single>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** A date in a field: the label and the date are its name; the month opens on the chosen day, today ringed. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('button', { name: 'Date 2 November 2026' })
    await userEvent.click(field)
    const grid = await body.findByRole('grid', { name: 'November 2026' })
    // the popover pops in
    await waitFor(() => expect(grid).toBeVisible())
    // the chosen day takes the focus
    await waitFor(() => expect(within(grid).getByRole('button', { name: 'Monday, 2 November' })).toHaveFocus())
    await userEvent.click(within(grid).getByRole('button', { name: 'Thursday, 12 November' }))
    await waitFor(() => expect(body.queryByRole('grid')).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Date 12 November 2026' })).toHaveFocus()
  },
}

/** Nothing picked: the placeholder; the month opens on today's. */
export const Empty: Story = {
  args: { initial: null },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Date Pick a date' }))
    const grid = await body.findByRole('grid', { name: 'October 2026' })
    await waitFor(() => expect(grid).toBeVisible())
  },
}

/** The keyboard: Enter opens, arrows move by day and week, Page Down by month, Enter picks, Escape closes. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: /^Date / }).focus()
    await userEvent.keyboard('{Enter}')
    const grid = await body.findByRole('grid', { name: 'November 2026' })
    await waitFor(() => expect(within(grid).getByRole('button', { name: 'Monday, 2 November' })).toHaveFocus())
    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    await expect(within(grid).getByRole('button', { name: 'Tuesday, 10 November' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Date 10 November 2026' })).toHaveFocus())
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{PageDown}')
    await expect(await body.findByRole('grid', { name: 'December 2026' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('grid')).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Date 10 November 2026' })).toHaveFocus()
  },
}

/** Days that can't be picked (Sundays and the past here) are grey and skipped; the months before `min` don't open. */
export const DisabledDays: Story = {
  args: {
    initial: null,
    min: today,
    max: '2026-12-31',
    isDisabled: (date: string) => at(date).getUTCDay() === 0,
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Date Pick a date' }))
    const grid = await body.findByRole('grid', { name: 'October 2026' })
    await expect(within(grid).getByRole('button', { name: 'Tuesday, 13 October' })).toBeDisabled()
    await expect(within(grid).getByRole('button', { name: 'Sunday, 18 October' })).toBeDisabled()
    await expect(within(grid).getByRole('button', { name: 'Thursday, 15 October' })).toBeEnabled()
    await expect(body.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  },
}

/** A range: the first click starts it, the second ends it (in either order); its days sit on a band. */
export const Range: Story = {
  render: () => <Ranged initial={null} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dates Pick a date' }))
    const grid = await body.findByRole('grid', { name: 'October 2026' })
    await userEvent.click(within(grid).getByRole('button', { name: 'Thursday, 22 October' }))
    // still open for the last day
    await expect(grid).toBeInTheDocument()
    await userEvent.click(within(grid).getByRole('button', { name: 'Monday, 19 October' }))
    await waitFor(() => expect(body.queryByRole('grid')).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Dates 19 Oct – 22 Oct 2026' })).toBeVisible()
  },
}

/** A range chosen before: the band shows it when the month opens. */
export const RangeChosen: Story = {
  render: () => <Ranged initial={{ from: '2026-11-02', to: '2026-11-06' }} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dates 2 Nov – 6 Nov 2026' }))
    const grid = await body.findByRole('grid', { name: 'November 2026' })
    for (const day of ['2', '4', '6'])
      await expect(grid.querySelector(`[data-day="2026-11-0${day}"]`)).toHaveAttribute('aria-selected', 'true')
  },
}

/** In a form with an error: the field's line turns red and the message describes it. */
export const Invalid: Story = {
  render: () => (
    <Field label="Date" error="This date has passed." className="w-72">
      <DatePicker copy={copy} today={today} value="2026-10-01" onValueChange={() => {}} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Date 1 October 2026' })).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByRole('button', { name: 'Date 1 October 2026' })).toHaveAccessibleDescription('This date has passed.')
  },
}

/** The phone: the month fits in the popover, 16 from the edges. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Date / }))
    const grid = await body.findByRole('grid', { name: 'November 2026' })
    await waitFor(() => expect(grid).toBeVisible())
  },
}

/** Inside a modal (the special day's): the month opens above it, and the keyboard goes straight into the month. */
export const InModal: Story = {
  render: () => (
    <Modal defaultOpen>
      <ModalContent size={480}>
        <ModalHeader title="Add a special day" closeLabel="Close" />
        <Single initial="2026-11-02" today={today} />
      </ModalContent>
    </Modal>
  ),
  play: async () => {
    const dialog = within(await body.findByRole('dialog', { name: 'Add a special day' }))
    dialog.getByRole('button', { name: 'Date 2 November 2026' }).focus()
    await userEvent.keyboard('{Enter}')
    const grid = await body.findByRole('grid', { name: 'November 2026' })
    const chosen = within(grid).getByRole('button', { name: 'Monday, 2 November' })
    await waitFor(() => expect(chosen).toHaveFocus())
    // drawn on top: the day is what a click at its middle reaches, not the modal or its scrim
    await waitFor(() => {
      const box = chosen.getBoundingClientRect()
      return expect(chosen.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))).toBe(true)
    })
    await userEvent.keyboard('{ArrowRight}{Enter}')
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Date 3 November 2026' })).toHaveFocus())
  },
}

/** Today's day says so to a screen reader; the weekday columns are named in the words' language. */
export const TodayAndNames: Story = {
  args: { initial: null },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Date Pick a date' }))
    const grid = await body.findByRole('grid', { name: 'October 2026' })
    await expect(within(grid).getByRole('button', { name: 'Wednesday, 14 October' })).toHaveAttribute('aria-current', 'date')
    // the weekday row is hidden from screen readers (the days carry their names); its labels are in the language still
    await expect(grid.querySelector('th[aria-label="Monday"]')).toBeInTheDocument()
    await expect(grid.closest('[lang]')).toHaveAttribute('lang', 'en')
  },
}

/** A range can't hold a day that can't be picked: the second click past a Sunday starts again there. */
export const RangeOverDisabled: Story = {
  render: () => <RangedNoSundays />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dates Pick a date' }))
    const grid = await body.findByRole('grid', { name: 'October 2026' })
    await userEvent.click(within(grid).getByRole('button', { name: 'Friday, 16 October' }))
    // over Sunday 18: starts again on Monday 19
    await userEvent.click(within(grid).getByRole('button', { name: 'Monday, 19 October' }))
    await expect(grid).toBeInTheDocument()
    await userEvent.click(within(grid).getByRole('button', { name: 'Wednesday, 21 October' }))
    await waitFor(() => expect(body.queryByRole('grid')).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Dates 19 Oct – 21 Oct 2026' })).toBeVisible()
  },
}
