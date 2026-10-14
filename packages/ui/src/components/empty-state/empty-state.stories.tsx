/** Empty state — DS-Components → «Pickers & empty». */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarX2, SearchX } from 'lucide-react'
import { Button } from '../button'
import { EmptyState } from './empty-state'

const meta = {
  title: 'Display/EmptyState',
  component: EmptyState,
  args: {
    icon: <CalendarX2 />,
    title: 'Entek ýazylyşyňyz ýok',
    description: 'Ýakyndaky ýerleri açyň — boş wagtlar şu ýerde görüner.',
    action: (
      <Button variant="primary" asChild>
        <a href="#search">Gözlege geç</a>
      </Button>
    ),
  },
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const NoBookings: Story = {}
export const NoSlotsToday: Story = {
  args: {
    title: 'Bu gün boş wagt ýok',
    description: 'Başga gün saýlaň ýa-da indiki boş güne geçiň.',
    action: <Button>Indiki boş gün: Anna, 16 oktýabr</Button>,
  },
}
export const NoResults: Story = {
  args: {
    icon: <SearchX />,
    title: 'Hiç zat tapylmady',
    description: 'Süzgüçleri aýyryň ýa-da başga söz ýazyň.',
    action: <Button>Süzgüçleri arassala</Button>,
  },
}
