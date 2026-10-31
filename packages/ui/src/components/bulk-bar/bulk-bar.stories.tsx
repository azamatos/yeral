/**
 * BulkBar — DS-Patterns → Table «bulk bar» and DS-Business «Request row · booking row · bulk bar», from B-Bookings
 * (`.bulk`: «2 selected» · Confirm · Decline · Export CSV · clear). Stories are the component's tests: the actions,
 * the disabled state (nothing pending among the selected rows), export only, keyboard, a phone width and a Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Download } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../button'
import { Table, TableCell, TableFrame, TableHeader, TableRow, TableColumnHeader } from '../table'
import { BulkBar } from './bulk-bar'

const onClear = fn()
const onConfirm = fn()
const onDecline = fn()
const onExport = fn()

const meta = {
  title: 'Data/BulkBar',
  component: BulkBar,
  parameters: { layout: 'padded' },
  args: { count: '2 selected', clearLabel: 'Clear selection', onClear, 'aria-label': 'Selected bookings' },
  decorators: [
    // a short stand-in for the table's frame; a story that brings its own TableFrame sets `parameters.frame: false`
    (Story, { parameters }) =>
      parameters.frame === false ? (
        <Story />
      ) : (
        <div className="flex min-h-40 flex-col justify-end overflow-clip rounded-card border border-n-200">
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof BulkBar>
export default meta
type Story = StoryObj<typeof meta>

const actions = (disabled?: boolean) => (
  <>
    <Button variant="inverse-solid" size="s" disabled={disabled} onClick={onConfirm}>
      Confirm
    </Button>
    <Button variant="inverse-outline" size="s" disabled={disabled} onClick={onDecline}>
      Decline
    </Button>
    <Button variant="inverse-outline" size="s" onClick={onExport}>
      <Download aria-hidden />
      Export CSV
    </Button>
  </>
)

/** Confirm (white) · Decline · Export CSV (outline) · clear; the region is named and announces its count. */
export const Default: Story = {
  args: { children: actions() },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('region', { name: 'Selected bookings' })
    await expect(bar).toHaveTextContent('2 selected')
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm' }))
    await expect(onConfirm).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: 'Export CSV' }))
    await expect(onExport).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear selection' }))
    await expect(onClear).toHaveBeenCalledOnce()
  },
}

/** Nothing pending among the selected rows: Confirm and Decline are off (transparent, n-600 line, n-500 text). */
export const Disabled: Story = {
  args: { count: '1 selected', children: actions(true) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Decline' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  },
}

/** A viewer who may not answer the selected requests sees only the export. */
export const ExportOnly: Story = {
  args: {
    children: (
      <Button variant="inverse-outline" size="s" onClick={onExport}>
        <Download aria-hidden />
        Export CSV
      </Button>
    ),
  },
}

/** Keyboard: Tab walks the actions in order and ends on clear; Enter activates. */
export const Keyboard: Story = {
  args: { children: actions() },
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Confirm' })).toHaveFocus()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Clear selection' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(onClear).toHaveBeenCalled()
  },
}

/**
 * Last inside a `TableFrame` taller than the screen (B9's requests tab): the bar sticks to the viewport's bottom
 * while the page is at the top, instead of sitting at the table's foot off-screen. The frame clips with
 * `overflow-clip`; `overflow-hidden` would make it the scroll container the bar sticks to.
 */
export const InTallTable: Story = {
  args: { children: actions() },
  parameters: { frame: false },
  render: (args) => (
    <TableFrame>
      <Table columns="1fr 1fr 120px">
        <TableHeader>
          <TableColumnHeader>Client</TableColumnHeader>
          <TableColumnHeader>Service</TableColumnHeader>
          <TableColumnHeader>Time</TableColumnHeader>
        </TableHeader>
        {Array.from({ length: 60 }, (_, i) => (
          <TableRow key={i} selected={i < 2}>
            <TableCell>Client {i + 1}</TableCell>
            <TableCell>Haircut</TableCell>
            <TableCell>{`${String(9 + (i % 9)).padStart(2, '0')}:00`}</TableCell>
          </TableRow>
        ))}
      </Table>
      <BulkBar {...args} />
    </TableFrame>
  ),
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('region', { name: 'Selected bookings' })
    const frame = bar.parentElement!.getBoundingClientRect()
    await expect(frame.height).toBeGreaterThan(window.innerHeight)
    const rect = bar.getBoundingClientRect()
    await expect(rect.top).toBeGreaterThanOrEqual(0)
    await expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight)
  },
}

/** Phone: the buttons grow to 44 with radius 12 and wrap; the bar sits above the tab bar. */
export const Phone: Story = { args: { children: actions() }, globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the actions wrap to a second line, nothing has a fixed width. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: {
    count: 'Выбрано: 2',
    clearLabel: 'Снять выделение',
    children: (
      <>
        <Button variant="inverse-solid" size="s">
          Подтвердить
        </Button>
        <Button variant="inverse-outline" size="s">
          Отклонить
        </Button>
        <Button variant="inverse-outline" size="s">
          <Download aria-hidden />
          Экспортировать CSV
        </Button>
      </>
    ),
  },
}
