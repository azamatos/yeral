/** Drawer — booking detail from «Ýazylyşlarym» (right 480 on desktop, bottom sheet on phones). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MapPin, Phone } from 'lucide-react'
import { useRef, useState } from 'react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { Button } from '../button'
import { StatusBadge } from '../status-badge'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTrigger } from './drawer'

function BookingDetail({ defaultOpen, scrim }: { defaultOpen?: boolean; scrim?: 'always' | 'auto' }) {
  return (
    <Drawer defaultOpen={defaultOpen} scrim={scrim}>
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

/** The business app (`scrim="auto"`): from 1280 no scrim, the page beside it stays usable; below 1280 it dims as before. */
export const ScrimAuto: Story = {
  name: 'Scrim auto · 1440',
  args: { scrim: 'auto' },
  globals: { viewport: { value: 'xl' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Jikme-jiklikler' }))
    const dialog = await screen.findByRole('dialog', { name: 'Glow Studio' })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(document.querySelector('.bg-scrim')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Ýap' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  },
}

export const ScrimAutoTablet: Story = {
  name: 'Scrim auto · 1024 (dims)',
  args: { scrim: 'auto', defaultOpen: true },
  globals: { viewport: { value: 'md' } },
  play: async () => {
    await screen.findByRole('dialog', { name: 'Glow Studio' })
    await expect(document.querySelector('.bg-scrim')).not.toBeNull()
  },
}

/** Opened from elsewhere (an account menu's row): `returnFocus` names where the focus goes back when it closes. */
function FromAMenu() {
  const [open, setOpen] = useState(false)
  const account = useRef<HTMLButtonElement>(null)
  return (
    <div className="flex gap-3">
      <Button ref={account}>Hasap</Button>
      <Button onClick={() => setOpen(true)}>Profilim</Button>
      <Drawer open={open} onOpenChange={setOpen} scrim="auto" returnFocus={account}>
        <DrawerContent>
          <DrawerHeader title="Profilim" subtitle="Ýeral hasabyňyz" closeLabel="Ýap" />
          <DrawerBody>Maýsa Annaýewa</DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export const ReturnFocus: Story = {
  name: 'Focus back to where it was opened from',
  render: () => <FromAMenu />,
  globals: { viewport: { value: 'xl' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Profilim' }))
    const dialog = await screen.findByRole('dialog', { name: 'Profilim' })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(dialog).toHaveAccessibleDescription('Ýeral hasabyňyz')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Hasap' })).toHaveFocus())
  },
}

const REQUESTS = ['Arzygül H. · 14:30', 'Mahym D. · 16:00', 'Şemşat K. · 16:00', 'Gözel A. · 17:30', 'Mähri G. · 13:00']

function OneAtATime() {
  const [at, setAt] = useState(0)
  return (
    <Drawer defaultOpen scrim="always">
      <DrawerContent>
        <DrawerHeader
          title="Request"
          closeLabel="Close"
          pager={{
            position: `${at + 1} / ${REQUESTS.length}`,
            previous: { label: 'Previous request', disabled: at === 0, onClick: () => setAt(at - 1) },
            next: { label: 'Next request', disabled: at === REQUESTS.length - 1, onClick: () => setAt(at + 1) },
          }}
        />
        <DrawerBody>{REQUESTS[at]}</DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}

/** Title + pager: one request at a time, most urgent first; previous and next around «1 / 5». */
export const HeaderPager: Story = {
  render: () => <OneAtATime />,
  globals: { viewport: { value: 'xl' } },
  play: async () => {
    const dialog = await screen.findByRole('dialog', { name: 'Request' })
    await waitFor(() => expect(dialog).toBeVisible())
    const previous = screen.getByRole('button', { name: 'Previous request' })
    await expect(previous).toHaveAttribute('aria-disabled', 'true')
    await expect(dialog).toHaveTextContent('1 / 5')
    const next = screen.getByRole('button', { name: 'Next request' })
    await userEvent.click(next)
    await expect(dialog).toHaveTextContent('2 / 5')
    await expect(dialog).toHaveTextContent('Mahym D. · 16:00')
    await expect(previous).not.toHaveAttribute('aria-disabled')
    // to the last with the keys: «Next» turns off, keeps the focus and does nothing more
    for (let i = 0; i < 3; i++) await userEvent.keyboard('{Enter}')
    await expect(dialog).toHaveTextContent('5 / 5')
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await expect(next).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(dialog).toHaveTextContent('5 / 5')
  },
}
