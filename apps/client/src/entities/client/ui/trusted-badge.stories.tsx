/**
 * TrustedBadge and TrustedCard — C7-Booking D2 (design v0.7 · D; COMPONENTS.md «Client/Account/TrustedBadge»): the
 * 24-high badge in the completed tones with its tooltip, and the explainer card on top of Profile in its three states:
 * Trusted, Almost there (the five-step bar), Paused after a missed booking.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { TrustedBadge, TrustedCard } from './trusted-badge'

function Cards() {
  return (
    <div className="flex max-w-116 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <span className="text-[18px] leading-6 font-semibold">Aýjemal Gurbanowa</span>
        <TrustedBadge />
      </div>
      <TrustedCard standing={{ state: 'trusted', visits: 7, pausedSince: null }} />
      <TrustedCard standing={{ state: 'almost', visits: 3, pausedSince: null }} />
      <TrustedCard standing={{ state: 'paused', visits: 0, pausedSince: '2026-09-02' }} />
    </div>
  )
}

const meta = {
  title: 'Client/Account/TrustedBadge',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang': Cards } },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The badge with its tooltip; the three cards: what the mark gives, «2 more visits» with 3 of 5 lit, paused since 2 Sep. */
export const States: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Trusted')).toHaveAttribute('title', 'Trusted on Ýeral: 5 or more visits, no missed bookings')
    const trusted = canvas.getByRole('region', { name: 'You’re a trusted client' })
    await expect(trusted).toHaveTextContent('7 visits on Ýeral, no missed bookings')
    await expect(trusted).toHaveTextContent('Places that confirm bookings by hand can confirm yours at once.')
    const almost = canvas.getByRole('region', { name: '2 more visits to become a trusted client' })
    await expect(almost).toHaveTextContent('3 of 5 visits, no missed bookings')
    await expect(almost.querySelector('[role="img"]')).toHaveAttribute('aria-label', '3 of 5 visits')
    const paused = canvas.getByRole('region', { name: 'Trusted is paused' })
    await expect(paused).toHaveTextContent('A missed booking on 2 Sep')
    await expect(paused).toHaveTextContent('5 visits without a missed booking bring the mark back.')
  },
}

/** 390: the cards fill the width. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
