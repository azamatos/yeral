/** Drawer — booking detail from «Ýazylyşlarym» (right 480 on desktop, bottom sheet on phones). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MapPin, Phone } from 'lucide-react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { Button } from '../button'
import { StatusBadge } from '../status-badge'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTrigger } from './drawer'

function BookingDetail({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Drawer defaultOpen={defaultOpen}>
      <DrawerTrigger asChild>
        <Button>Jikme-jiklikler</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader
          title="Glow Studio"
          subtitle="Bitarap Türkmenistan şaýoly 247"
          closeLabel="Ýap"
          leading={<img src="/photos/adam-winger-FkAZqQJTbXM-unsplash.jpg" alt="" className="size-12 flex-none rounded-m object-cover" />}
        />
        <DrawerBody>
          <StatusBadge status="pending">Garaşylýar</StatusBadge>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-body">
            <dt className="text-n-600">Hyzmat</dt>
            <dd className="m-0">Aýal saç kesimi · 60 min</dd>
            <dt className="text-n-600">Hünärmen</dt>
            <dd className="m-0">Aýna</dd>
            <dt className="text-n-600">Wagt</dt>
            <dd className="m-0 tabular-nums">Ertir · Penşenbe, 15 oktýabr · 14:30</dd>
            <dt className="text-n-600">Bahasy</dt>
            <dd className="m-0">80 TMT · Töleg ýerinde</dd>
          </dl>
        </DrawerBody>
        <DrawerFooter>
          <Button>
            <MapPin />
            Ýol görkez
          </Button>
          <Button>
            <Phone />
            Jaň et
          </Button>
          <Button variant="danger">Ýazylyşy ýatyr</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const meta = { title: 'Overlays/Drawer', component: BookingDetail } satisfies Meta<typeof BookingDetail>
export default meta
type Story = StoryObj<typeof meta>

export const Booking: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Jikme-jiklikler' }))
    const dialog = await screen.findByRole('dialog', { name: 'Glow Studio' })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.click(screen.getByRole('button', { name: 'Ýap' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  },
}
export const Open: Story = { args: { defaultOpen: true } }
export const PhoneSheet: Story = {
  name: 'Open on a phone (bottom sheet)',
  args: { defaultOpen: true },
  globals: { viewport: { value: 'xs' } },
}
