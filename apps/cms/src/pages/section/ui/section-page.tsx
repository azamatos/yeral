import { EmptyState } from '@yeral/ui/empty-state'
import { Hammer } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { TeamPage, type Section } from '@/widgets/team-shell'

/** Stands in for a section still being built (slice 6's next PRs replace each). */
export function SectionPage({ section }: { section: Section }) {
  const t = useTranslations('shell')
  return (
    <TeamPage title={t(`sections.${section}`)}>
      <EmptyState icon={<Hammer />} title={t('soon')} />
    </TeamPage>
  )
}
