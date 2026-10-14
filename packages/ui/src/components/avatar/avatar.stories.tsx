/** Avatars — initials on tint (people), neutral inside option cards, photo when there is one. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Avatar, initials } from './avatar'

const meta = { title: 'Display/Avatar', component: Avatar, args: { name: 'Aýjemal Gurbanowa' } } satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof meta>

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Aýjemal Gurbanowa" size={32} />
      <Avatar name="Aýjemal Gurbanowa" size={40} />
      <Avatar name="Aýjemal" size={44} />
      <Avatar name="Aýna" size={48} tone="neutral" />
      <Avatar name="Aýjemal Gurbanowa" size={56} />
    </div>
  ),
  play: async () => {
    await expect(initials('Aýjemal Gurbanowa')).toBe('AG')
    await expect(initials('ýazgül')).toBe('Ý')
  },
}

export const Photo: Story = { args: { src: '/photos/adam-winger-FkAZqQJTbXM-unsplash.jpg', size: 56 } }
