/** Option cards — booking → specialist step: «Islendik hünärmen» first, then specialists who do all chosen services. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Users } from 'lucide-react'
import { expect, userEvent } from 'storybook/test'
import { Avatar } from '../avatar'
import { Rating } from '../rating'
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
