/** Brand — lockups (ink, white), mark and app icon from docs/design/assets/brand. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo } from './logo'

const meta = { title: 'Foundations/Brand', component: Logo, args: { alt: 'Ýeral' } } satisfies Meta<typeof Logo>
export default meta
type Story = StoryObj<typeof meta>

export const All: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-8">
      <Logo alt="Ýeral" />
      <div className="rounded-m bg-n-900 p-4">
        <Logo variant="lockup-white" alt="Ýeral" />
      </div>
      <Logo variant="mark" height={40} alt="Ýeral" />
      <Logo variant="icon" height={56} alt="Ýeral" className="rounded-l" />
    </div>
  ),
}
