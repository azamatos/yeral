import { useTranslations } from 'use-intl'
import { WorkspacePage, type Section } from '@/widgets/workspace-shell'

/**
 * Stands in for a section's page until its slice builds it (P4: the calendar, bookings and clients in slice 4, reviews
 * with theirs; Settings has its own frame, `pages/settings`): the shell with the section's top bar and an empty page, so every item leads somewhere. On
 * the phone the calendar's top bar holds the workspace switcher strip (B-Mobile).
 */
export function SectionPage({ section }: { section: Section }) {
  const t = useTranslations('shell.sections')
  return <WorkspacePage title={t(section)} switcherOnPhone={section === 'calendar'} />
}
