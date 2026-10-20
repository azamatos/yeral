/** Modal — Account-Bookings cancel modal (480), login (400), review (560). Bottom sheet under 768. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { brand } from '../../brand'
import { Button } from '../button'
import { Chip } from '../chip'
import { Modal, ModalActions, ModalClose, ModalContent, ModalDescription, ModalHeader, ModalTrigger } from './modal'

function CancelBooking({ defaultOpen }: { defaultOpen?: boolean }) {
  const [reason, setReason] = useState<string | null>(null)
  return (
    <Modal defaultOpen={defaultOpen}>
      <ModalTrigger asChild>
        <Button variant="danger">Ýazylyşy ýatyr</Button>
      </ModalTrigger>
      <ModalContent size={480}>
        <ModalHeader title="Ýazylyşy ýatyrmalymy?" closeLabel="Ýap" />
        <ModalDescription>Barber Loft · Erkek saç kesimi · Penşenbe, 15 oktýabr, 14:30. Biznese derrew habar bereris.</ModalDescription>
        <div className="flex flex-col gap-2.5">
          <span className="text-dense font-semibold" id="reason">
            Sebäbi (hökman däl)
          </span>
          <div role="group" aria-labelledby="reason" className="flex flex-wrap gap-2">
            {['Meýilnamam üýtgedi', 'Başga ýer tapdym', 'Wagtym ýok', 'Başga sebäp'].map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </div>
        <ModalActions>
          <ModalClose asChild>
            <Button>Yza</Button>
          </ModalClose>
          <Button variant="danger-solid">Hawa, ýatyr</Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}

const meta = { title: 'Overlays/Modal', component: CancelBooking } satisfies Meta<typeof CancelBooking>
export default meta
type Story = StoryObj<typeof meta>

export const Cancel: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Ýazylyşy ýatyr' })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Ýazylyşy ýatyrmalymy?' })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

export const Open: Story = { args: { defaultOpen: true } }

export const PhoneSheet: Story = {
  name: 'Open on a phone (bottom sheet)',
  args: { defaultOpen: true },
  globals: { viewport: { value: 'xs' } },
}

/** Auth «Login · phone»: the 400 modal with the brand icon and the close button on top, the title and lead under them. */
function Login({ title, lead, closeLabel }: { title: string; lead: string; closeLabel: string }) {
  return (
    <Modal defaultOpen>
      <ModalContent size={400}>
        <ModalHeader
          media={<img src={brand.icon} alt="" width={40} height={40} className="size-10 rounded-s" />}
          title={title}
          closeLabel={closeLabel}
        >
          <ModalDescription>{lead}</ModalDescription>
        </ModalHeader>
        <Button variant="primary" className="w-full">
          Send code
        </Button>
      </ModalContent>
    </Modal>
  )
}

export const LoginWithMedia: StoryObj<typeof Login> = {
  name: 'Login (400, brand icon on top)',
  render: (args) => <Login {...args} />,
  args: { title: 'Log in to Ýeral', lead: 'Enter your phone number to manage your bookings.', closeLabel: 'Close' },
  play: async () => {
    const dialog = await screen.findByRole('dialog', { name: 'Log in to Ýeral' })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(dialog).toHaveAccessibleDescription('Enter your phone number to manage your bookings.')
    await waitFor(() => expect(dialog.getBoundingClientRect().width).toBe(400))
  },
}

export const LoginPhone: StoryObj<typeof Login> = {
  ...LoginWithMedia,
  name: 'Login on a phone (bottom sheet)',
  globals: { viewport: { value: 'xs' } },
  play: async () => {
    await expect(await screen.findByRole('dialog', { name: 'Log in to Ýeral' })).toBeInTheDocument()
  },
}

export const LoginRussianLength: StoryObj<typeof Login> = {
  ...LoginWithMedia,
  name: 'Login, Russian (+30% length)',
  args: {
    title: 'Войдите в Ýeral, чтобы продолжить',
    lead: 'Введите номер телефона, чтобы управлять своими записями и избранными местами.',
    closeLabel: 'Закрыть',
  },
  play: async () => {
    const dialog = await screen.findByRole('dialog', { name: 'Войдите в Ýeral, чтобы продолжить' })
    await waitFor(() => expect(dialog).toBeVisible())
  },
}
