/** Search — DS-Components → «Search · hero», «Search · compact», and the header query bar from the client screens. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MapPin, Navigation } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { CompactSearch } from './compact-search'
import { HeroSearch, HeroSearchField, HeroSearchInput } from './hero-search'
import { QueryBar, QuerySegment, QuerySubmit } from './query-bar'

const meta = { title: 'Inputs/Search', component: HeroSearch, args: { submitLabel: 'Gözle' } } satisfies Meta<typeof HeroSearch>
export default meta
type Story = StoryObj<typeof meta>

const onSubmit = fn((e: React.FormEvent) => e.preventDefault())

export const Hero: Story = {
  render: () => (
    <HeroSearch submitLabel="Gözle" onSubmit={onSubmit} className="max-w-240">
      <HeroSearchField label="Näme?" grow={1.3}>
        <HeroSearchInput name="what" placeholder="Hyzmat, ýer ýa-da hünärmen" />
      </HeroSearchField>
      <HeroSearchField label="Nirede?" icon={<Navigation />}>
        <HeroSearchInput name="near" defaultValue="Ýakynymda" />
      </HeroSearchField>
      <HeroSearchField label="Haçan?">
        <HeroSearchInput name="when" placeholder="Islendik wagt" />
      </HeroSearchField>
    </HeroSearch>
  ),
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Näme?'), 'Diş lukmany')
    await userEvent.click(canvas.getByRole('button', { name: 'Gözle' }))
    await expect(onSubmit).toHaveBeenCalled()
  },
}

export const Compact: Story = {
  render: () => <CompactSearch query="Diş lukmany" details="Ýakynymda · Ertir" actionLabel="Üýtget" onClick={fn()} />,
}

export const HeaderQueryBar: Story = {
  name: 'Header query bar',
  render: () => (
    <QueryBar className="max-w-160">
      <QuerySegment label="Näme?" value="Ähli hyzmatlar" />
      <QuerySegment label="Nirede?" value="Ýakynymda" icon={<MapPin />} />
      <QuerySegment label="Haçan?" value="Islendik wagt" />
      <QuerySubmit label="Gözle" />
    </QueryBar>
  ),
}

export const HeaderQueryBarPhone: Story = {
  name: 'Header query bar (phone)',
  globals: { viewport: { value: 'xs' } },
  render: () => (
    <QueryBar>
      <QuerySegment label="Näme?" value="Ähli hyzmatlar" />
      <QuerySegment label="Nirede?" value="Ýakynymda" icon={<MapPin />} />
      <QuerySubmit label="Gözle" />
    </QueryBar>
  ),
}
