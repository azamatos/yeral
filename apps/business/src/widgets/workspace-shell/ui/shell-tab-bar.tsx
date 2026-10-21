import { Link, useLocation } from '@tanstack/react-router'
import { BottomTab, BottomTabBar, BottomTabButton } from '@yeral/ui/bottom-tab-bar'
import { MoreSheet, MoreSheetDivider, MoreSheetPerson, MoreSheetRow } from '@yeral/ui/more-sheet'
import { SUPPORT_LINE } from '@yeral/features/contact-yeral'
import { ExternalLink, Headset, LogOut, Menu, User } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeral, useContactYeral } from '@/features/contact-yeral'
import { sectionOf, sectionsFor, type Section } from '../model/sections'
import { useAccount } from '../model/use-account'
import { useWorkspace } from '../model/use-workspace'
import { SectionIcon } from './section-icon'
import { ShellSwitcher } from './shell-switcher'

/** On the tab bar; the rest of the sections are in More (B-Mobile). */
const TABS: readonly Section[] = ['calendar', 'bookings', 'clients']

/**
 * The phone's menu under 768 (B-Mobile): Calendar · Bookings (the requests this person may answer) · Clients · More.
 * More opens the sheet above the bar: the workspace (its switcher), Reviews and Settings where the level has them, the
 * person, the client site, Contact Ýeral (its small sheet over More: call or Telegram) and Log out.
 */
export function ShellTabBar({ onProfile }: { onProfile: (opener: HTMLElement | null) => void }) {
  const t = useTranslations('shell')
  const words = useTranslations()
  const contact = useContactYeral()
  const { slug, me, workspace } = useWorkspace()
  const account = useAccount()
  const pathname = useLocation({ select: (l) => l.pathname })
  const [more, setMore] = useState(false)
  const moreButton = useRef<HTMLButtonElement>(null)
  // another page (a row, another workspace from the switcher): More has done its job
  const [at, setAt] = useState(pathname)
  if (at !== pathname) {
    setAt(pathname)
    setMore(false)
  }
  if (!workspace) return null
  const requests = workspace.requestsToAnswer
  const inMore = sectionsFor(workspace.level).filter((s) => !TABS.includes(s))
  const here = sectionOf(pathname)

  return (
    <>
      <BottomTabBar aria-label={t('menu')} className="fixed inset-x-0 bottom-0 z-30 sm:hidden">
        {TABS.map((section) => (
          <BottomTab
            key={section}
            asChild
            icon={<SectionIcon section={section} />}
            label={t(`sections.${section}`)}
            count={section === 'bookings' ? { count: requests, label: t('requests', { count: requests }) } : null}
          >
            <Link to={`/w/$slug/${section}`} params={{ slug }} />
          </BottomTab>
        ))}
        <BottomTabButton
          ref={moreButton}
          icon={<Menu />}
          label={t('more')}
          aria-expanded={more}
          // a section that lives in More is the page on screen: More reads as current
          aria-current={here && inMore.includes(here) && !more ? 'page' : undefined}
          onClick={() => setMore((open) => !open)}
        />
      </BottomTabBar>
      <MoreSheet open={more} onOpenChange={setMore} label={t('more')}>
        <ShellSwitcher variant="row" />
        <MoreSheetDivider />
        {inMore.map((section) => (
          <MoreSheetRow
            key={section}
            asChild
            drill
            icon={<SectionIcon section={section} />}
            label={t(`sections.${section}`)}
            count={
              section === 'reviews' && workspace.reviewsToAnswer > 0
                ? { count: workspace.reviewsToAnswer, tone: 'muted', label: t('reviewsToAnswer', { count: workspace.reviewsToAnswer }) }
                : null
            }
            onClick={() => setMore(false)}
          >
            <Link to={`/w/$slug/${section}`} params={{ slug }} />
          </MoreSheetRow>
        ))}
        <MoreSheetDivider />
        {me && <MoreSheetPerson name={account.name} phone={account.phone} />}
        <MoreSheetRow
          drill
          icon={<User />}
          label={t('account.profile')}
          onClick={() => {
            setMore(false)
            // My profile closes back to More, as the sheet it came from would
            onProfile(moreButton.current)
          }}
        />
        <MoreSheetRow asChild icon={<ExternalLink />} label={t('account.openAsClient')} hint={account.client.host}>
          <a href={account.client.href} target="_blank" rel="noreferrer" />
        </MoreSheetRow>
        <ContactYeral
          trigger={
            <MoreSheetRow
              drill
              icon={<Headset />}
              label={contact.title}
              caption={words('support.contactCaption', { phone: SUPPORT_LINE.phone })}
            />
          }
        />
        <MoreSheetRow
          danger
          icon={<LogOut />}
          label={t('account.logout')}
          onClick={() => {
            setMore(false)
            account.logout()
          }}
        />
      </MoreSheet>
    </>
  )
}
