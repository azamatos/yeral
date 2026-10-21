/**
 * Language switcher — DS-Components → Navigation, DS-Patterns v0.6 («English first», «One language»): globe + code in
 * the header, a radio menu of the market's languages named in themselves; nothing at all with one language.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { LanguageSwitcher, type LanguageOption } from './language-switcher'

const TURKMENISTAN: LanguageOption[] = [
  { value: 'en', name: 'English' },
  { value: 'tk', name: 'Türkmençe', localName: 'Turkmen' },
  { value: 'ru', name: 'Русский', localName: 'Russian' },
]

function Switcher({ options, actionLabel }: { options: LanguageOption[]; actionLabel: string }) {
  const [value, setValue] = useState(options[0]?.value ?? 'en')
  return (
    <div className="flex min-h-10 items-center gap-2" data-testid="nav">
      <LanguageSwitcher value={value} onValueChange={setValue} options={options} actionLabel={actionLabel} />
    </div>
  )
}

const meta = {
  title: 'Navigation/LanguageSwitcher',
  component: Switcher,
  args: { options: TURKMENISTAN, actionLabel: 'choose a language' },
} satisfies Meta<typeof Switcher>
export default meta
type Story = StoryObj<typeof meta>

/** A market with several languages: English first, then the market's; the choice moves the code in the button. */
export const Several: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /^en — choose a language$/ })
    await userEvent.click(button)
    const menu = within(document.body)
    await expect(await menu.findByRole('menuitemradio', { name: /English/ })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(menu.getByRole('menuitemradio', { name: /Türkmençe/ }))
    await expect(canvas.getByRole('button', { name: /^tk — choose a language$/ })).toBeVisible()
  },
}

/** The first launch: one language, so no switcher (not a disabled one). */
export const OneLanguage: Story = {
  args: { options: [{ value: 'en', name: 'English' }] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
    await expect(canvas.getByTestId('nav')).toBeEmptyDOMElement()
  },
}

/** Russian-length names and screen-reader words (~30% longer) still fit the menu. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: {
    actionLabel: 'выбрать язык интерфейса',
    options: [
      { value: 'en', name: 'English', localName: 'Английский язык' },
      { value: 'tk', name: 'Türkmençe', localName: 'Туркменский язык' },
      { value: 'ru', name: 'Русский', localName: 'Русский язык' },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /выбрать язык/ }))
    const turkmen = await within(document.body).findByRole('menuitemradio', { name: /Туркменский/ })
    await waitFor(() => expect(turkmen).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** Phone width: the header button keeps its 40 target. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
}
