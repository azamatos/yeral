/** `/{lang}` — the stand-in for Home (P4 slice 5) under the site's chrome. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { SiteLayout } from '@/widgets/site-layout'
import { accountApi, PageStory } from '@/shared/storybook'
import { HomePage } from './home-page'

function Home() {
  return (
    <SiteLayout>
      <HomePage />
    </SiteLayout>
  )
}

const meta = {
  title: 'Client/Pages/Home',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang': Home }, server: accountApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const StandIn: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Ýeral' })).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
