/**
 * Display/Legend (DS-Patterns → Status «Legend & status dot»): the keys under a chart or beside a plan. S swatches 14
 * (fill, dashed, an icon) at 12/16; M chart keys at 13/18 (a solid or dashed line, a 10 swatch with a bold name and
 * its value). Stories are the component's tests: one per variant, plus the Russian-length words.
 */
import { Phone } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Legend, type LegendItem } from './legend'

const plan: LegendItem[] = [
  {
    label: 'Pending (request)',
    swatch: { kind: 'fill', color: 'var(--color-st-pending-bg)', line: 'var(--color-st-pending-dot)', dashed: true },
  },
  { label: 'Confirmed', swatch: { kind: 'fill', color: 'var(--color-a-50)', line: 'var(--color-a-line)' } },
  { label: 'Cancelled', swatch: { kind: 'fill', color: 'var(--color-n-0)', line: 'var(--color-st-cancelled-dot)', dashed: true } },
  { label: 'Break', swatch: { kind: 'fill', color: 'var(--color-n-100)', line: 'var(--color-n-100)' } },
  { label: 'Outside hours', swatch: { kind: 'fill', color: 'var(--color-n-50)', line: 'var(--color-n-200)' } },
  { label: 'By phone', icon: <Phone aria-hidden /> },
]

const chart: LegendItem[] = [
  { label: 'September', swatch: { kind: 'line' } },
  { label: 'August', swatch: { kind: 'line', dashed: true } },
  { label: 'Regular', value: 151, swatch: { kind: 'fill', color: 'var(--color-chart-1)' } },
]

const meta = {
  title: 'Display/Legend',
  component: Legend,
  args: { items: plan, 'aria-label': 'Key' },
} satisfies Meta<typeof Legend>
export default meta
type Story = StoryObj<typeof meta>

/** S: fills with their line (solid or dashed), an icon in place of a swatch. */
export const Swatch: Story = {
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole('list', { name: 'Key' })
    await expect(within(list).getAllByRole('listitem')).toHaveLength(6)
    await expect(within(list).getByText('Outside hours')).toBeVisible()
  },
}

/** M chart keys: a solid line for the period, a dashed one for the compared period. */
export const Line: Story = {
  args: { size: 'm', items: chart.slice(0, 1) },
}

/** M: the dashed line, n-400. */
export const Dashed: Story = {
  args: { size: 'm', items: chart.slice(1, 2) },
}

/** M chart keys together: lines, and a 10 swatch with a bold name and its value. */
export const ChartKeys: Story = {
  args: { size: 'm', items: chart },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole('list', { name: 'Key' })
    await expect(within(list).getByText('Regular')).toHaveClass('font-semibold')
    await expect(within(list).getByText('151')).toBeVisible()
  },
}

/** Beside a chart that carries its own data table the legend is decorative. */
export const Decorative: Story = {
  args: { size: 'm', items: chart, 'aria-hidden': true, 'aria-label': undefined },
}

/** Russian-length words at both sizes: the keys wrap, nothing is cut. */
export const Russian: Story = {
  render: () => (
    <div className="flex max-w-80 flex-col gap-4">
      <Legend
        aria-label="Обозначения"
        items={[
          {
            label: 'Ожидает (запрос)',
            swatch: { kind: 'fill', color: 'var(--color-st-pending-bg)', line: 'var(--color-st-pending-dot)', dashed: true },
          },
          { label: 'Подтверждено', swatch: { kind: 'fill', color: 'var(--color-a-50)', line: 'var(--color-a-line)' } },
          { label: 'Отменено', swatch: { kind: 'fill', color: 'var(--color-n-0)', line: 'var(--color-st-cancelled-dot)', dashed: true } },
          { label: 'Вне рабочего времени', swatch: { kind: 'fill', color: 'var(--color-n-50)', line: 'var(--color-n-200)' } },
          { label: 'По телефону', icon: <Phone aria-hidden /> },
        ]}
      />
      <Legend
        size="m"
        aria-label="Обозначения графика"
        items={[
          { label: 'Сентябрь', swatch: { kind: 'line' } },
          { label: 'Август', swatch: { kind: 'line', dashed: true } },
          { label: 'Постоянные', value: 151, swatch: { kind: 'fill', color: 'var(--color-chart-1)' } },
        ]}
      />
    </div>
  ),
}
