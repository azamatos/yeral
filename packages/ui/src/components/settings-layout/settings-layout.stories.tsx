/**
 * Navigation/SettingsLayout — the business app's settings (B-Settings `.setl`, DS-Business «Settings navigation · final
 * list»): the menu Business profile · Booking rules · Hours · Services · Team · Permissions · Link and QR beside the open
 * section, from 1024; under 1024 a chip row above it that scrolls sideways. The section: its header, groups with a
 * hairline, and the save bar under them while there are changes. Stories are the component's tests: the open item,
 * the laptop, tablet and phone widths, a Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarCheck, Clock, QrCode, ShieldCheck, Store, Tag, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { expect } from 'storybook/test'
import { SaveBar } from '../save-bar'
import { SettingsRow } from '../settings-row'
import { Switch } from '../switch'
import {
  SettingsLayout,
  SettingsNav,
  SettingsNavItem,
  SettingsPane,
  SettingsPaneHeader,
  SettingsSection,
  SettingsSectionTitle,
} from './settings-layout'

type Item = 'profile' | 'rules' | 'hours' | 'services' | 'team' | 'permissions' | 'link'

const ICONS: Record<Item, ReactNode> = {
  profile: <Store />,
  rules: <CalendarCheck />,
  hours: <Clock />,
  services: <Tag />,
  team: <UserRound />,
  permissions: <ShieldCheck />,
  link: <QrCode />,
}

interface Words {
  nav: string
  items: Record<Item, string>
  title: string
  lead: string
  group: string
  caption: string
  row: string
  help: string
  bar: { message: string; label: string; discard: string; save: string; saving: string }
}

const EN: Words = {
  nav: 'Settings sections',
  items: {
    profile: 'Business profile',
    rules: 'Booking rules',
    hours: 'Hours',
    services: 'Services',
    team: 'Team',
    permissions: 'Permissions',
    link: 'Link and QR',
  },
  title: 'Booking rules',
  lead: 'How clients book you and what happens to their bookings.',
  group: 'Online booking',
  caption: 'Clients book you on Ýeral and at your link.',
  row: 'Take bookings online',
  help: 'Off: clients see your phone number to call you.',
  bar: { message: 'Save your changes?', label: 'Unsaved changes', discard: 'Discard', save: 'Save', saving: 'Saving' },
}

// ~30% longer, as the Russian is (Q-101)
const RU: Words = {
  nav: 'Разделы настроек',
  items: {
    profile: 'Профиль бизнеса',
    rules: 'Правила записи',
    hours: 'Часы работы',
    services: 'Услуги',
    team: 'Команда',
    permissions: 'Права доступа',
    link: 'Ссылка и QR-код',
  },
  title: 'Правила записи',
  lead: 'Как клиенты записываются к вам и что происходит с их записями.',
  group: 'Онлайн-запись',
  caption: 'Клиенты записываются к вам на Ýeral и по вашей ссылке.',
  row: 'Принимать записи онлайн',
  help: 'Выключено: клиенты видят ваш номер телефона, чтобы позвонить.',
  bar: {
    message: 'Сохранить изменения?',
    label: 'Несохранённые изменения',
    discard: 'Не сохранять',
    save: 'Сохранить',
    saving: 'Сохраняем',
  },
}

function Settings({ open = 'rules', words = EN, dirty = false }: { open?: Item; words?: Words; dirty?: boolean }) {
  return (
    <SettingsLayout
      nav={
        <SettingsNav aria-label={words.nav}>
          {(Object.keys(ICONS) as Item[]).map((item) => (
            <SettingsNavItem
              key={item}
              href={`#${item}`}
              icon={ICONS[item]}
              aria-current={item === open ? 'page' : undefined}
              onClick={(e) => e.preventDefault()}
            >
              {words.items[item]}
            </SettingsNavItem>
          ))}
        </SettingsNav>
      }
    >
      <SettingsPane>
        <SettingsPaneHeader title={words.title} lead={words.lead} />
        <SettingsSection aria-labelledby="group">
          <SettingsSectionTitle id="group" caption={words.caption}>
            {words.group}
          </SettingsSectionTitle>
          <SettingsRow label={words.row} description={words.help}>
            {({ id, descriptionId }) => <Switch id={id} aria-describedby={descriptionId} defaultChecked />}
          </SettingsRow>
        </SettingsSection>
        {dirty ? (
          <SaveBar
            message={words.bar.message}
            label={words.bar.label}
            discardLabel={words.bar.discard}
            saveLabel={words.bar.save}
            savingLabel={words.bar.saving}
            onDiscard={() => {}}
            onSave={() => {}}
          />
        ) : null}
      </SettingsPane>
    </SettingsLayout>
  )
}

const meta = {
  title: 'Navigation/SettingsLayout',
  component: Settings,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Settings>
export default meta
type Story = StoryObj<typeof meta>

/** From 1024: the 240 menu beside the section; the open one in tint and `aria-current`. */
export const Default: Story = {
  globals: { viewport: { value: 'xl' } },
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: 'Settings sections' })
    await expect(nav).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Booking rules' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Hours' })).not.toHaveAttribute('aria-current')
    await expect(canvas.getByRole('heading', { level: 2, name: 'Booking rules' })).toBeVisible()
    await expect(canvas.getByRole('region', { name: 'Online booking' })).toBeVisible()
  },
}

/** The section with changes: the save bar under its groups. */
export const WithChanges: Story = {
  args: { dirty: true },
  globals: { viewport: { value: 'xl' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('region', { name: 'Unsaved changes' })).toBeVisible()
  },
}

/** 1024: the menu still beside the section (the shell's sidebar is 248 here). */
export const Laptop: Story = { args: { open: 'link' }, globals: { viewport: { value: 'md' } } }

/** Under 1024: a chip row above the section that scrolls sideways; the open chip in tint. */
export const Tablet: Story = { args: { open: 'hours' }, globals: { viewport: { value: 'sm' } } }

/** The phone: the same chip row, 16 from the edges. */
export const Phone: Story = { args: { open: 'profile', dirty: true }, globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the menu's names wrap onto a second line, the chips stay on one and scroll. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: { words: RU, dirty: true },
  globals: { viewport: { value: 'xl' } },
}

/** A group's title as an h2 (`as="h2"`), for a page that shows a settings group under its own h1: same look, one level up. */
export const SectionTitleH2: Story = {
  render: () => (
    <SettingsSection aria-labelledby="link">
      <SettingsSectionTitle as="h2" id="link" caption="Put it in your Instagram profile — clients book straight from it.">
        Your page link
      </SettingsSectionTitle>
    </SettingsSection>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Your page link' })).toBeVisible()
    await expect(canvas.getByRole('region', { name: 'Your page link' })).toBeVisible()
  },
}
