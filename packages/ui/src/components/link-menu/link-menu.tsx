import { ExternalLink } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useState, type ReactElement } from 'react'
import { Sheet, SheetTitle } from '../../lib/sheet'
import { useMediaQuery } from '../../lib/use-media-query'
import { MenuContent, MenuLinkItem, MenuTitle, type MenuLink } from '../menu'
import { MoreSheetRow } from '../more-sheet'

/**
 * A title and a few links with a second line, opened by any trigger, which keeps its own look (B-Shell ContactMenu:
 * "Contact Ýeral" → Call · Write on Telegram, from the account menu, the owner's box, the Hidden by Ýeral banner): a
 * menu 300 wide from 768, a small sheet on phones (B-Mobile: "as a small sheet"). Esc, a tap outside or a link closes
 * it, and the focus goes back to the trigger.
 */
export function LinkMenu({
  trigger,
  title,
  links,
  align = 'start',
}: {
  /** A button: a text link, a row of a sheet. */
  trigger: ReactElement
  /** The caps title on top, and the menu's name: "Contact Ýeral". */
  title: string
  links: readonly MenuLink[]
  align?: 'start' | 'center' | 'end'
}) {
  const wide = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)
  if (!wide)
    return (
      <Sheet open={open} onOpenChange={setOpen} trigger={trigger}>
        <SheetTitle className="m-0 px-5 pt-2 pb-1 text-label font-normal text-n-600 uppercase">{title}</SheetTitle>
        <div className="flex flex-col px-2 pb-2">
          {links.map((link) => (
            <MoreSheetRow
              key={link.id}
              asChild
              icon={link.icon}
              label={link.label}
              caption={link.caption}
              hint={link.external ? <ExternalLink aria-hidden className="size-4 text-n-500" /> : undefined}
            >
              <a href={link.href} {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})} onClick={() => setOpen(false)} />
            </MoreSheetRow>
          ))}
        </div>
      </Sheet>
    )
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <MenuContent aria-label={title} aria-labelledby={undefined} align={align} className="w-75">
        <MenuTitle>{title}</MenuTitle>
        {links.map((link) => (
          <MenuLinkItem key={link.id} link={link} />
        ))}
      </MenuContent>
    </DropdownMenu.Root>
  )
}
