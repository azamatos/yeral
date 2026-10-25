import icon from './yeral-icon.png'
import lockupInk from './yeral-lockup-ink.png'
import lockupWhite from './yeral-lockup-white.png'
import mark from './yeral-mark.png'
import tabIcon from './yeral-tab-icon.png'
import touchIcon from './yeral-touch-icon.png'

/**
 * Brand assets from docs/design/assets/brand. A rebrand replaces these files (and the `common.brand` message);
 * nothing else in the code names the brand. `tabIcon` (64 px) and `touchIcon` (180 px, a phone's home screen) are the
 * icon without `icon`'s light frame and shadow: the purple square with transparent corners, drawn from `mark`
 * (25.10.2026; the frame showed white around the tab icon).
 */
export const brand = { icon, lockupInk, lockupWhite, mark, tabIcon, touchIcon } as const
export { Logo } from './logo'
