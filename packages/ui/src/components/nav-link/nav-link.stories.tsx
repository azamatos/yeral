/** Client top nav pieces — DS-Components → «Client top nav · 72». */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Logo } from '../../brand'
import { Button } from '../button'
import { LanguageSwitcher } from '../language-switcher'
import { QueryBar, QuerySegment, QuerySubmit } from '../search'
import { NavLink } from './nav-link'

function TopNav() {
  const [lang, setLang] = useState('tk')
  return (
    <header className="flex h-18 items-center gap-6 border-b border-n-200 px-6">
      <a href="#home" aria-label="Ýeral — baş sahypa">
        <Logo alt="Ýeral" />
      </a>
      <QueryBar>
        <QuerySegment label="Näme?" value="Ähli hyzmatlar" />
        <QuerySegment label="Nirede?" value="Ýakynymda" />
        <QuerySegment label="Haçan?" value="Islendik wagt" />
        <QuerySubmit label="Gözle" />
      </QueryBar>
      <div className="flex-1" />
      <nav className="flex items-center gap-1">
        <NavLink href="#biznes">Biznes üçin</NavLink>
        <LanguageSwitcher
          value={lang}
          onValueChange={setLang}
          actionLabel="dil saýla"
          options={[
            { value: 'tk', name: 'Türkmençe' },
            { value: 'ru', name: 'Русский', localName: 'Rus dili' },
            { value: 'en', name: 'English', localName: 'Iňlis dili' },
          ]}
        />
        <Button size="s">Giriş</Button>
      </nav>
    </header>
  )
}

const meta = { title: 'Navigation/Top nav', component: TopNav, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof TopNav>
export default meta
type Story = StoryObj<typeof meta>
export const SearchHeader: Story = {}
