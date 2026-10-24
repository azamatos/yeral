import { Link, useParams } from '@tanstack/react-router'
import { SettingsLayout, SettingsNav, SettingsNavItem } from '@yeral/ui/settings-layout'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { SETTINGS_SECTIONS } from '../model/sections'
import { SettingsSectionIcon } from './section-icon'

/**
 * Settings' frame (B-Settings `.setl`; design §8, §28.5): the settings' menu, and the open section beside it from 1024
 * or under its chip row below. It sits inside the workspace page (the top bar «Settings» is the page's h1) and stays
 * while the sections change: the section is `children`, a <SettingsPage>.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('settings')
  const { slug } = useParams({ from: '/w/$slug' })
  return (
    <SettingsLayout
      nav={
        <SettingsNav aria-label={t('nav')}>
          {SETTINGS_SECTIONS.map((section) => (
            <SettingsNavItem key={section} asChild icon={<SettingsSectionIcon section={section} />}>
              <Link to={`/w/$slug/settings/${section}`} params={{ slug }}>
                {t(`sections.${section}`)}
              </Link>
            </SettingsNavItem>
          ))}
        </SettingsNav>
      }
    >
      {children}
    </SettingsLayout>
  )
}
