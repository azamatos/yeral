/**
 * Business/Onboarding/CategoryPicker — B-Onboarding step 2 (round 3.4: one flat list of 11, search over names and
 * hints, «No category fits? Contact Ýeral.»). Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { I18nProvider } from '@/shared/i18n'
import { LAUNCH_CATEGORIES } from '@/shared/storybook'
import { CategoryPicker } from './category-picker'

const meta = {
  title: 'Business/Onboarding/CategoryPicker',
  component: CategoryPicker,
  args: { categories: LAUNCH_CATEGORIES, value: null, onChange: fn() },
  decorators: [
    (Story) => (
      <I18nProvider locale="en">
        <div className="max-w-160">{Story()}</div>
      </I18nProvider>
    ),
  ],
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    return (
      <CategoryPicker
        {...args}
        value={value}
        onChange={(id) => {
          setValue(id)
          args.onChange(id)
        }}
      />
    )
  },
} satisfies Meta<typeof CategoryPicker>
export default meta
type Story = StoryObj<typeof meta>

/** Nothing chosen yet: the whole list. Choosing a row says «Selected: …». */
export const Empty: Story = {
  play: async ({ args, canvas }) => {
    const group = canvas.getByRole('radiogroup', { name: 'Category' })
    await expect(within(group).getAllByRole('radio')).toHaveLength(11)
    await userEvent.click(canvas.getByRole('radio', { name: 'Nails' }))
    await expect(args.onChange).toHaveBeenCalledWith('nails')
    await expect(canvas.getByText('Nails', { selector: 'span.font-semibold' })).toBeVisible()
    await expect(canvas.getByRole('radio', { name: 'Nails' })).toBeChecked()
  },
}

/** Glow Studio's category. */
export const Selected: Story = { args: { value: 'beauty' } }

/** The search finds categories by their hints too: «tutor» → Lessons. */
export const Search: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search categories' }), 'tutor')
    await expect(canvas.getAllByRole('radio')).toHaveLength(1)
    await expect(canvas.getByRole('radio', { name: 'Lessons' })).toBeVisible()
  },
}

/** Nothing matches: the box offers Contact Ýeral (Call the support line, Write on Telegram). */
export const NoMatch: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search categories' }), 'cafe')
    await expect(await canvas.findByText('No category fits? Contact Ýeral.')).toBeVisible()
    await expect(canvas.getByText('Nothing matches “cafe”. Try another word, or tell us what you do.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Contact Ýeral' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Contact Ýeral' })
    // the menu fades in
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** On a phone the Contact Ýeral menu is a small sheet. */
export const Phone: Story = { args: { value: 'beauty' }, globals: { viewport: { value: 'xs' } } }
