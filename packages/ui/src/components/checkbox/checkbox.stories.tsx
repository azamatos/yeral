/** Checkbox and radio — native controls, 18px, violet when on (DS-Components → Selection). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Checkbox, Radio } from './checkbox'

const meta = { title: 'Selection/Checkbox and radio', component: Checkbox } satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

export const Checkboxes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Checkbox label="Ýatlatma iber" defaultChecked />
      <Checkbox label="Teswir haýyşy" />
      <Checkbox label="Elýeterli däl" disabled />
    </div>
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByLabelText('Teswir haýyşy')
    await userEvent.click(box)
    await expect(box).toBeChecked()
  },
}

export const Radios: Story = {
  render: () => (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 text-dense font-semibold">Hünärmen</legend>
      <Radio name="staff" label="Islendik hünärmen" defaultChecked />
      <Radio name="staff" label="Aýna" />
      <Radio name="staff" label="Myrat" />
    </fieldset>
  ),
}
