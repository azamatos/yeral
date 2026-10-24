import { Link, useParams } from '@tanstack/react-router'
import { SettingsLayout, SettingsNav, SettingsNavItem } from '@yeral/ui/settings-layout'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { SectionMoved, useSectionMovedRef } from '../model/moved'
import { SETTINGS_SECTIONS } from '../model/sections'
import { SettingsSectionIcon } from './section-icon'

/**
 * Settings' frame (B-Settings `.setl`; design §8, §28.5): the settings' menu, and the open section beside it from 1024
 * or under its chip row below (the row reaches the page's edges, undoing WorkspacePage's 24 / 16 padding). It sits
 * inside the workspace page (the top bar «Settings» is the page's h1) and stays while the sections change: the section
 * is `children`, a <SettingsPage>, which takes the focus on its name when it's opened from the menu.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const t = useTranslations()
  const { slug } = useParams({ from: '/w/$slug' })
  const moved = useSectionMovedRef()
  return (
    <SettingsLayout
      nav={
        <SettingsNav aria-label={t('settings.nav')} className="max-md:-mx-6 max-md:px-6 max-sm:-mx-4 max-sm:px-4">
          {SETTINGS_SECTIONS.map((section) => (
            <SettingsNavItem key={section} asChild icon={<SettingsSectionIcon section={section} />}>
              <Link to={`/w/$slug/settings/${section}`} params={{ slug }}>
                {t(`settings.sections.${section}`)}
              </Link>
            </SettingsNavItem>
          ))}
        </SettingsNav>
      }
    >
      <SectionMoved value={moved}>{children}</SectionMoved>
    </SettingsLayout>
  )
}
