import { useLocation, useNavigate } from '@tanstack/react-router'
import { WorkspaceSwitcher, type WorkspaceItem } from '@yeral/ui/workspace-switcher'
import { useTranslations } from 'use-intl'
import { sameSectionIn } from '../model/sections'
import { useAccount } from '../model/use-account'
import { useWorkspace } from '../model/use-workspace'

/**
 * The person's workspaces in the switcher (book B-10): rows "level · city" with the requests they may answer there;
 * picking one opens the same section of it (the address changes, the route loads it, and it becomes the last used);
 * "Create a business" opens the setup wizard at the business step, already signed in.
 */
export function ShellSwitcher({ variant, className }: { variant: 'sidebar' | 'rail' | 'strip' | 'row'; className?: string }) {
  const t = useTranslations('shell')
  const tl = useTranslations('levels')
  const { slug, workspaces, workspace } = useWorkspace()
  const account = useAccount()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  if (!workspace || !workspaces) return null

  const level = tl(workspace.level)
  const items: WorkspaceItem[] = workspaces.items.map((w) => ({
    id: w.slug,
    name: w.name,
    caption: t('where', { level: tl(w.level), city: w.city.name }),
    logo: w.logo?.url,
    current: w.slug === slug,
    count: w.requestsToAnswer > 0 ? { count: w.requestsToAnswer, label: t('requests', { count: w.requestsToAnswer }) } : null,
  }))
  return (
    <WorkspaceSwitcher
      variant={variant}
      name={workspace.name}
      level={level}
      logo={workspace.logo?.url}
      items={items}
      person={account.person && t('switcher.person', { name: account.name, phone: account.phone })}
      copy={{
        title: t('switcher.title'),
        create: t('switcher.create'),
        trigger: t('switcher.trigger', { name: workspace.name, level }),
        current: t('switcher.current'),
        note: t('switcher.note'),
        close: t('switcher.close'),
      }}
      onSelect={(to) => {
        const next = workspaces.items.find((w) => w.slug === to)
        if (!next) return
        // the same section there, when the person's level there has it
        const target = sameSectionIn(pathname, next)
        void navigate({ to: `/w/$slug/${target.section}`, params: { slug: target.slug } })
      }}
      onCreate={() => void navigate({ to: '/setup/$step', params: { step: 'business' } })}
      className={className}
    />
  )
}
