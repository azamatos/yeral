/**
 * Option cards — booking → specialist step: «Islendik hünärmen» first, then specialists who do all chosen services;
 * the setup wizard's big choices (`size="l"`) and its radio-first rows (`indicator="start"`, B-Onboarding step 7).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, Clock, UserCheck, Users, Zap } from 'lucide-react'
import { expect, userEvent } from 'storybook/test'
import { Avatar } from '../avatar'
import { Rating } from '../rating'
import { StatusBadge } from '../status-badge'
import { OptionCard, OptionCardGroup } from './option-card'

const meta = { title: 'Selection/OptionCard', component: OptionCardGroup } satisfies Meta<typeof OptionCardGroup>
export default meta
type Story = StoryObj<typeof meta>

export const Specialists: Story = {
  render: () => (
    <OptionCardGroup defaultValue="any" aria-label="Hünärmen" className="max-w-180">
      <OptionCard
        value="any"
        leading={
          <span className="flex size-12 flex-none items-center justify-center rounded-pill bg-n-100 text-n-900">
            <Users className="size-5" />
          </span>
        }
        title="Islendik hünärmen"
        caption="Iň ir boş wagt: şu gün 15:00"
      />
      <OptionCard
        value="ayna"
        leading={<Avatar name="Aýna" size={48} tone="neutral" />}
        title="Aýna"
        caption="Indiki boş wagt: ertir 10:00"
        trailing={<Rating value="4,9" />}
      />
      <OptionCard
        value="myrat"
        leading={<Avatar name="Myrat" size={48} tone="neutral" />}
        title="Myrat"
        caption="Bu hyzmaty etmeýär"
        disabled
      />
    </OptionCardGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('radio', { name: /Aýna/ }))
    await expect(canvas.getByRole('radio', { name: /Aýna/ })).toHaveAttribute('aria-checked', 'true')
  },
}

/** The wizard's big choice (B-Onboarding `.rcard`): the icon tile, «Recommended», the caption, then what the client sees. */
export const Large: Story = {
  render: () => (
    <OptionCardGroup defaultValue="manual" aria-label="Confirmation" className="grid max-w-184 grid-cols-2 gap-4 max-sm:grid-cols-1">
      <OptionCard
        value="manual"
        size="l"
        icon={<UserCheck strokeWidth={1.75} />}
        title="I confirm"
        tag="Recommended"
        caption="Every new booking arrives as a request"
        trailing={
          <span className="inline-flex flex-wrap items-center gap-2 text-dense text-n-600">
            Client sees
            <StatusBadge status="pending" icon={<Clock aria-hidden strokeWidth={2} />}>
              Pending
            </StatusBadge>
          </span>
        }
      />
      <OptionCard
        value="instant"
        size="l"
        icon={<Zap strokeWidth={1.75} />}
        title="Instant confirmation"
        caption="The client is booked as soon as they pick a free time"
        trailing={
          <span className="inline-flex flex-wrap items-center gap-2 text-dense text-n-600">
            Client sees
            <StatusBadge status="confirmed" icon={<Check aria-hidden strokeWidth={2} />}>
              Confirmed
            </StatusBadge>
          </span>
        }
      />
    </OptionCardGroup>
  ),
  play: async ({ canvas }) => {
    const manual = canvas.getByRole('radio', { name: /I confirm/ })
    await expect(manual).toHaveAttribute('aria-checked', 'true')
    await expect(manual).toHaveAccessibleName('I confirm Recommended')
    await expect(manual).toHaveAccessibleDescription(/Every new booking arrives as a request Client sees Pending/)
    await userEvent.click(canvas.getByRole('radio', { name: /Instant confirmation/ }))
    await expect(canvas.getByRole('radio', { name: /Instant confirmation/ })).toHaveAttribute('aria-checked', 'true')
  },
}

/** Rows with the radio first (B-Onboarding `.rro`, «Who answers requests?»): the checked title in the accent ink. */
export const IndicatorStart: Story = {
  render: () => (
    <OptionCardGroup defaultValue="both" aria-label="Who answers requests?" className="max-w-184 gap-2">
      <OptionCard
        value="desk"
        indicator="start"
        title="Owner and admins"
        caption="Specialists see their own requests but don’t answer them"
      />
      <OptionCard
        value="each"
        indicator="start"
        title="Each specialist"
        caption="Each specialist answers their own requests; admins only view them"
      />
      <OptionCard value="both" indicator="start" title="Both" caption="Whoever answers first. The others see the answer at once" />
    </OptionCardGroup>
  ),
  play: async ({ canvas }) => {
    const both = canvas.getByRole('radio', { name: /Both/ })
    await expect(both).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(canvas.getByRole('radio', { name: /Each specialist/ }))
    await expect(canvas.getByRole('radio', { name: /Each specialist/ })).toHaveAttribute('aria-checked', 'true')
  },
}
