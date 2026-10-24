# Settings' frame and Link and QR (P4 slice 2; feat/settings-frame)

- **`@yeral/ui/settings-layout`** (`Navigation/SettingsLayout`, B-Settings `.setl` `.snav` `.pane` `.phd` `.ps`):
  `SettingsLayout` (menu + section; from 1024 a 240 menu sticky 24 from the top, 40 apart; under 1024 a chip row
  above that scrolls sideways, as the board's 1023 rule, not COMPONENTS.md's 768/900; the page passes the classes
  that take it edge to edge), `SettingsNav`,
  `SettingsNavItem` (sidebar item from 1024, 44 chip below; `aria-current="page"` from the router's link),
  `SettingsPane` (max 720, 520 before an aside wraps under it), `SettingsPaneHeader` (h2 22/28 + lead + `action`),
  `SettingsSection` (hairline group, 24 / 20) and `SettingsSectionTitle` (h3 17/24 + caption).
- **The frame:** `widgets/settings-frame` (`SETTINGS_SECTIONS` profile · rules · hours · services · team · permissions
  · link, `settingsSectionOf`, `SettingsFrame` = the layout with the menu, `SettingsPage` = one section's pane);
  `pages/settings` (`SettingsLayoutPage`: the workspace page «Settings» + the frame around `<Outlet/>`, the tab
  «Hours · Settings · Glow Studio» via `WorkspacePage`'s new `tabTitle` parts; `SettingsPlaceholder`: a section's
  header only, until it's built). Focus: «Settings» (h1) takes it once when Settings opens (`focusKey="settings"`); a
  section opened from the menu takes it on its own h2 (`SettingsPage`, `model/moved.ts`). Routes: `w/$slug/settings/route.tsx` (layout), `index.tsx` (→ profile), one file per section.
  A Specialist never gets there (the shell's `placeFor` already closes `settings/*`).
- **Adding a section:** a page slice `pages/settings-<section>` whose page returns
  `<SettingsPage section="hours" lead={…} action={…} aside={…}>` with `<SettingsSection>` groups from
  `@yeral/ui/settings-layout` and `SettingsRow`s; then swap `SettingsPlaceholder` for it in
  `app/routes/w/$slug/settings/<section>.tsx`. Words under `settings.<section>.*` in `messages/en.json` (the menu's
  names are `settings.sections.*`). A form section puts `<SaveBar>` (`@yeral/ui/save-bar`: «Save your changes?»,
  Discard · Save, `label` «Unsaved changes», `saving`, `invalid`) last in the pane, shown only while dirty, and a toast
  «Saved» after. The board draws no "leave with unsaved changes" prompt: none is built. Stories: copy
  `pages/settings-link/ui/settings-link-page.stories.tsx` (shell + frame + fake api; `PageStory` now nests layouts).
- **Link and QR** (`pages/settings-link`): where the page stands from the workspace's `status` (Live · In review ·
  Not approved with the reason and «Fix and send again» → Business profile · Hidden by Ýeral with the reason and
  Contact Ýeral; nothing for the demo), the page link (`PageLinkField` in `shared/ui`, now also the done step's;
  `shareLinks` moved to `shared/lib`), «The link has no language in it» only when the market has several languages,
  and the QR card (`QrBlock` card) with its downloads. No «Booking button» (later).
- The done step's checklist «Add» opens `settings/profile` (the logo, photos and About are there).
- Review (one round): fixed the focus on a section change, the chip row's cut focus ring, the pane's 720 cap under
  1024, the bleed out of `@yeral/ui`, the hidden note's line, the board's «QR code downloaded · PNG», «Settings» from
  `shell.sections.settings`. Kept: the download said in QrBlock's status line (COMPONENTS.md), not the board's toast.
- Follow-ups: Permissions (the fixed read-only table, B-Team `tab=permissions`) is still a placeholder; CopyField
  doesn't wrap its buttons under the input on a phone (`.lrow` wraps on the board); switching workspaces from
  `settings/hours` lands on `settings/profile` (`sameSectionIn` keeps the top section only).
