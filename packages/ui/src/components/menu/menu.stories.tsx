/** Menus — the signed-in avatar menu and the language switcher (DS-Components → Navigation). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarCheck, ChevronDown, Globe, Heart, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { Avatar } from '../avatar'
import { Button } from '../button'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from './menu'

function AccountMenu() {
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          aria-label="Hasabym"
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-pill border border-n-300 bg-n-0 pr-2.5 pl-1.25 hover:bg-n-50 focus-visible:shadow-focus"
        >
          <Avatar name="Aýjemal" size={32} />
          <ChevronDown className="size-4" />
        </button>
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>
          <span className="text-small font-semibold text-n-900">Aýjemal Gurbanowa</span>
          <span className="text-dense text-n-600">+993 65 90 11 22</span>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem>
          <CalendarCheck />
          Ýazylyşlarym
        </MenuItem>
        <MenuItem>
          <Heart />
          Halanlarym
        </MenuItem>
        <MenuItem>
          <User />
          Profil
        </MenuItem>
        <MenuSeparator />
        <MenuItem>
          <LogOut />
          Çykmak
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

function LanguageMenu() {
  const [lang, setLang] = useState('tk')
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost">
          <Globe />
          {lang.toUpperCase()}
          <span className="sr-only">— dil saýla</span>
        </Button>
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuRadioGroup value={lang} onValueChange={setLang}>
          <MenuRadioItem value="tk" description="Türkmençe">
            Türkmençe
          </MenuRadioItem>
          <MenuRadioItem value="ru" description="Rus dili">
            Русский
          </MenuRadioItem>
          <MenuRadioItem value="en" description="Iňlis dili">
            English
          </MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

const meta = { title: 'Overlays/Menu', component: AccountMenu } satisfies Meta<typeof AccountMenu>
export default meta
type Story = StoryObj<typeof meta>

export const Account: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Hasabym' }))
    const item = await screen.findByRole('menuitem', { name: 'Ýazylyşlarym' })
    await waitFor(() => expect(item).toBeVisible())
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Escape}')
  },
}

export const Language: Story = {
  render: () => <LanguageMenu />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /dil saýla/ }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /English/ }))
    await expect(canvas.getByRole('button', { name: /dil saýla/ })).toHaveTextContent('EN')
  },
}
