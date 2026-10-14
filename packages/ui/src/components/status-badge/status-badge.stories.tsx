/** Booking statuses — one colour and shape everywhere (Main → «Booking statuses»; DS-Components → Badges). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Phone, Store, UserX } from 'lucide-react'
import { StatusBadge } from './status-badge'

const meta = { title: 'Status/StatusBadge', component: StatusBadge, args: { status: 'pending', children: 'Garaşylýar' } } satisfies Meta<
  typeof StatusBadge
>
export default meta
type Story = StoryObj<typeof meta>

export const All: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status="pending">Garaşylýar</StatusBadge>
      <StatusBadge status="confirmed">Tassyklandy</StatusBadge>
      <StatusBadge status="completed">Tamamlandy</StatusBadge>
      <StatusBadge status="cancelled">Ýatyryldy</StatusBadge>
      <StatusBadge status="noshow">Gelmedi</StatusBadge>
    </div>
  ),
}

export const CancelledBy: Story = {
  name: 'Cancelled by client / business',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status="cancelled" icon={<UserX />}>
        Müşderi ýatyrdy
      </StatusBadge>
      <StatusBadge status="cancelled" icon={<Store />}>
        Biznes ýatyrdy
      </StatusBadge>
    </div>
  ),
}

export const PhoneBooking: Story = {
  name: 'Phone booking (= Confirmed + phone icon)',
  render: () => (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-small font-medium">
        Merdan K.
        <Phone aria-label="Telefon arkaly ýazylyş" className="size-3.5" />
      </span>
      <StatusBadge status="confirmed">Tassyklandy</StatusBadge>
    </div>
  ),
}

export const Russian: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge status="pending">Ожидает</StatusBadge>
      <StatusBadge status="confirmed">Подтверждена</StatusBadge>
      <StatusBadge status="completed">Завершена</StatusBadge>
      <StatusBadge status="cancelled">Отменена</StatusBadge>
      <StatusBadge status="noshow">Неявка</StatusBadge>
    </div>
  ),
}
