import { useLocation, useNavigate } from '@tanstack/react-router'
import { formatPhone } from '@yeral/domain/phone'
import { WorkspaceSwitcher, type WorkspaceItem } from '@yeral/ui/workspace-switcher'
import { useTranslations } from 'use-intl'
import { sameSectionIn } from '../model/sections'
import { useWorkspace } from '../model/use-workspace'

/**
 * The person's workspaces in the switcher (book B-10): rows "level · city" with the requests they may answer there;
 * picking one opens the same section of it (the address changes, the route loads it, and it becomes the last used);
 * "Create a business" opens the setup wizard at the business step, already signed in.
 */
export function ShellSwitcher({ variant, className }: { variant: 'sidebar' | 'rail' | 'strip' | 'row'; className?: string }) {
  const t = useTranslations('shell')
  const tl = useTranslations('levels')
  const { slug, me, workspaces, workspace } = useWorkspace()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  if (!workspace || !workspaces) return null

  const level = tl(workspace.level)
  const items: WorkspaceItem[] = workspaces.items.map((w) => ({
    id: w.slug,
    name: w.name,
    caption: t('where', { level: tl(w.level), city: w.city.name }),
    logo: w.photo?.url,
    current: w.slug === slug,
    count: w.requestsToAnswer > 0 ? { count: w.requestsToAnswer, label: t('requests', { count: w.requestsToAnswer }) } : null,
  }))
  const name = me?.name ?? me?.firstName
  return (
    <WorkspaceSwitcher
      variant={variant}
      name={workspace.name}
      level={level}
      logo={workspace.photo?.url}
      items={items}
      person={me && (name ? t('switcher.person', { name, phone: formatPhone(me.phone) }) : formatPhone(me.phone))}
      copy={{
        title: t('switcher.title'),
        create: t('switcher.create'),
        trigger: t('switcher.trigger', { name: workspace.name, level }),
        current: t('switcher.current'),
        note: t('switcher.note'),
        close: t('switcher.close'),
      }}
      onSelect={(to) => {
        const target = sameSectionIn(pathname, to)
        void navigate({ to: `/w/$slug/${target.section}`, params: { slug: target.slug } })
      }}
      onCreate={() => void navigate({ to: '/setup/$step', params: { step: 'business' } })}
      className={className}
    />
  )
}
