# The shell's components in @yeral/ui (feat/p4-ui-shell)

- Changed: P4 slice 1 (Accounts), PR 2 split in two: the design-system pieces first (this), then the business app's
  shell on them. Source: DS-Patterns 06 (Navigation & layout) and the Avatar, CountBadge and Tooltip drawings,
  COMPONENTS.md rows SideNav, WorkspaceSwitcher, AccountMenu, BottomTabBar, MoreSheet, AppTopBar, Avatar, CountBadge,
  Tooltip; B-Shell and B-Mobile for the layouts.
- New: `workspace-switcher` (`sidebar` closed + "Your workspaces" menu 300 with radio rows 52, current in tint with a
  check, others with the amber count, "Create a business" with the dashed tile; `rail` logo in a 44 button; `strip`
  the phone header's 48 strip and `row` the More sheet's row, both opening a bottom sheet with rows 64 and the note).
  `account-menu` (user block: avatar 32, name, phone, ghost 36 "…"; menu 300 above it, a danger row after a separator;
  `rail`: the avatar in a 44 button). `bottom-tab-bar` (`BottomTabBar` 64 + safe area, `BottomTab` 63 with the 18 h
  amber count, `BottomTabButton` for More with `aria-expanded`, `TAB_BAR_HEIGHT`). `more-sheet` (`MoreSheet` above the
  tab bar, `MoreSheetRow` 48 with drill chevron, count, hint, danger; `MoreSheetDivider`, `MoreSheetPerson`).
  `app-top-bar` (64 / tablet 56 19/24 / phone 56 22/28, `leading` = the phone's switcher strip, which hides the title
  visually only). An internal `lib/sheet.tsx` (Radix Dialog as a phone bottom sheet, `above` for the tab bar).
- Extended: `SideNav` (`collapsed` rail; `SideNavItem` takes `icon`, `label`, `count {count, tone, label}`; names clamp
  at two lines; counts are decorative with the meaning in a hidden text; the rail's tooltip "Bookings · 6 requests").
  `Avatar` (sizes 24 28 36 64, `shape="square"` radii 8/10/12/14, neutral = n-100/n-600, `letters={1}`, `decorative`,
  `AddAvatar`). `CountBadge` (`muted`, `variant="dot"`, `max` → 99+). `Tooltip` (board values; `variant="label"`).
- How: menus are named by their visible label (Radix names a menu after its trigger otherwise); a decorative avatar
  draws its letters with CSS `content`, so a button named "Account menu: …" holds no stray initials (axe
  label-content-name-mismatch); the switcher's trigger has a space between name and level for the same rule; picking
  the current workspace does nothing.
- Not built yet: the Contact Ýeral submenu (its phone and Telegram are an open question), AppTopBar's detail variant
  (needs BackLink), the client account's aside (SideNav AccountAside), the demo sidebar (P4 slice 7).
- Tests: stories for every state on the board, a phone-width and a Russian-length story per component (Storybook
  tests: render, play, axe); the whole suite 192 green.
