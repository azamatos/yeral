/**
 * StatTile + StatRow — DS-Patterns → 03 Data display «Stat tile · L 32 (key figures) and M 22 (cards)», from
 * B-Analytics (`.stats .stat .tv`, later) and B-Client (`.stats .sv`, the client card's ClientStats). Stories are the
 * component's tests: one per state on the board (Large, Medium, WithDelta, HiddenValue, Loading, NoComparison), a
 * phone width and a Russian length. The delta is drawn with a Pill until DeltaPill exists.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowUp, Lock } from 'lucide-react'
import { expect } from 'storybook/test'
import { Pill } from '../pill'
import { StatRow, StatTile, StatTileSkeleton } from './stat-tile'

const meta = {
  title: 'Data/StatTile',
  component: StatTile,
  parameters: { layout: 'padded' },
  args: { label: 'Revenue', value: '46,200 TMT', caption: '41,250 TMT in August' },
} satisfies Meta<typeof StatTile>
export default meta
type Story = StoryObj<typeof meta>

function Up({ children }: { children: string }) {
  return (
    <Pill tone="success" icon={<ArrowUp aria-hidden />}>
      {children}
    </Pill>
  )
}

/** L · a row of 4 for the owner (See revenue): label, value 32/38, delta and caption. */
export const Large: Story = {
  render: () => (
    <StatRow aria-label="Key figures">
      <StatTile label="Revenue" value="46,200 TMT" delta={<Up>+12%</Up>} caption="41,250 TMT in August" />
      <StatTile label="Bookings" value="412" delta={<Up>+8%</Up>} caption="381 bookings in August" />
      <StatTile label="Average check" value="112 TMT" delta={<Up>+4%</Up>} caption="108 TMT in August" />
      <StatTile label="Returning clients" value="61%" delta={<Up>+5 pts</Up>} caption="56% in August" />
    </StatRow>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByRole('list', { name: 'Key figures' })
    await expect(row).toBeInTheDocument()
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
    await expect(canvas.getByText('46,200 TMT')).toHaveClass('tabular-nums')
  },
}

/** M · the client card's header: Visits · Average check · Last visit · No-shows, value 22/28, caption 13/18. */
export const Medium: Story = {
  render: () => (
    <StatRow aria-label="Statistics" className="border-t border-n-200 pt-6 pb-7">
      <StatTile size="m" label="Visits" value="12" caption="total 1,740 TMT" />
      <StatTile size="m" label="Average check" value="145 TMT" caption="from completed visits" />
      <StatTile size="m" label="Last visit" value="28 Sep" caption="Hair colouring · Aýna" />
      <StatTile size="m" label="No-shows" value="1" caption="19 August" />
    </StatRow>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('list', { name: 'Statistics' })).toBeInTheDocument()
    await expect(canvas.getByText('145 TMT')).toHaveClass('text-[22px]')
  },
}

/** One tile with its delta (the pill) and caption. */
export const WithDelta: Story = {
  args: { delta: <Up>+12%</Up> },
  render: (args) => (
    <StatRow columns={3} aria-label="Key figures">
      <StatTile {...args} />
    </StatRow>
  ),
}

/** Hidden value · Admin (no See revenue): the revenue tile is left out, the row re-flows to 3 and the toolbar shows the lock line. */
export const HiddenValue: Story = {
  render: () => (
    <div>
      <div className="flex items-center gap-3 pb-3">
        <span className="text-dense text-n-600">September 2026</span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-dense text-n-600">
          <Lock className="size-4" aria-hidden />
          Only the owner sees revenue
        </span>
      </div>
      <StatRow columns={3} aria-label="Key figures">
        <StatTile label="Bookings" value="412" delta={<Up>+8%</Up>} caption="381 in August" />
        <StatTile label="Returning clients" value="61%" caption="56% in August" />
        <StatTile label="No-shows" value="3" caption="0.7% of bookings" />
      </StatRow>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3)
    await expect(canvas.queryByText('Revenue')).not.toBeInTheDocument()
  },
}

/** Loading · the skeletons keep the geometry; the row is a status. */
export const Loading: Story = {
  render: () => (
    <StatRow columns={3} loading aria-label="Loading">
      <StatTileSkeleton />
      <StatTileSkeleton />
      <StatTileSkeleton />
    </StatRow>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
  },
}

/** No comparison yet · the first weeks: a caption, no delta. */
export const NoComparison: Story = {
  render: () => (
    <StatRow columns={3} aria-label="Key figures">
      <StatTile label="Revenue" value="1,450 TMT" caption="1–14 October" />
      <StatTile label="Bookings" value="12" caption="1–14 October" />
      <StatTile label="Average check" value="121 TMT" caption="from 12 visits" />
    </StatRow>
  ),
}

/** Phone: 2 × 2, the L value 24/30, the third tile starts the second line without a divider. */
export const Phone: Story = { ...Large, globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: labels and captions wrap inside the tile, the value stays on one line. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  render: () => (
    <StatRow aria-label="Статистика" className="border-t border-n-200 pt-6 pb-7">
      <StatTile size="m" label="Визиты" value="12" caption="всего 1 740 TMT" />
      <StatTile size="m" label="Средний чек" value="145 TMT" caption="по завершённым визитам" />
      <StatTile size="m" label="Последний визит" value="28 сен." caption="Окрашивание волос · Айна" />
      <StatTile size="m" label="Неявки" value="1" caption="19 августа" />
    </StatRow>
  ),
}
