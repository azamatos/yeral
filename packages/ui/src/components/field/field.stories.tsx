/** Fields — DS-Components → «Fields, search and form layout». Label above and always visible; hint or error below. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Button } from '../button'
import { Input, Textarea } from '../input'
import { Field } from './field'

const meta = {
  title: 'Inputs/Field',
  component: Field,
  args: { label: 'Adyňyz', children: null },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Field label="Adyňyz" hint="Label above, always visible." className="max-w-90">
      <Input placeholder="Adyňyz" />
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Adyňyz')
    await userEvent.type(input, 'Myrat')
    await expect(input).toHaveValue('Myrat')
    await expect(input).toHaveAccessibleDescription('Label above, always visible.')
  },
}

export const WithError: Story = {
  render: () => (
    <Field label="Adyňyz" error="Adyňyzy ýazyň." className="max-w-90">
      <Input />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Adyňyz')).toHaveAttribute('aria-invalid', 'true')
  },
}

export const Disabled: Story = {
  render: () => (
    <Field label="Telefon belgisi" disabled className="max-w-90">
      <Input value="+993 65 90 11 22" readOnly />
    </Field>
  ),
}

export const FormLayout: Story = {
  name: 'Form layout',
  render: () => (
    <form className="flex max-w-160 flex-col gap-4 rounded-card border border-n-200 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adyňyz">
          <Input defaultValue="Aýjemal" />
        </Field>
        <Field label="Familiýaňyz">
          <Input placeholder="Hökman däl" />
        </Field>
      </div>
      <Field label="Bellik">
        <Textarea placeholder="Biznese goşmaça maglumat" />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost">Yza</Button>
        <Button variant="primary" type="submit">
          Tassykla
        </Button>
      </div>
    </form>
  ),
}
