# Services groups you can tell apart, and name (feat/services-group-blocks)

- Changed (the owner's test of business.yeral.app, 25.10.2026): Settings → Services
  (`pages/settings-services/ui/settings-services-page.tsx`) and the wizard's step 5 (`pages/setup/ui/services-step.tsx`)
  show each group as a card: `rounded-card` border, a `bg-group` band with the name and the count (Settings) or «Select
  all» / «Clear» (the wizard) and the menu, the services under it, 16 px between groups, the columns' heading once above
  with the cards' inset. B-Services and B-Onboarding draw a header row instead; the owner's request wins (chapter 9).
- Changed: the wizard's group names are fields like the service names (`GROUP_NAME_MAX` 60 in `@/shared/config`,
  `original` on `ServiceGroupRow`, `servicesProblem` → `groupName`, «Name each group.»), labelled by the name they came
  with (a visually hidden h3 names each group's region); `servicesInput` sends a group's name only when changed. After
  a save the own group is found by its place among the groups sent (`savedOwnGroupId`), so «Add service» keeps adding
  there whatever its name. Settings → Services: «Rename group» in a group's menu (`RenameGroup`, the returned group put
  in the menu's cache at once); «Add group» and «Rename group» share `GroupNameField` (Escape and Cancel wait while it
  saves); the menu closing leaves the focus in the box, and Save or Cancel gives it back to the group's menu.
- Shared: `writtenIn(before, locale, text)` (`@/shared/lib`): a name written over in the reader's language with the
  market's others kept, used by the service drawer, «Rename group» and the wizard's step 5 (techContext.md).
- Decided: chapter 9, 25.10.2026, B-38 / B-04 (how), owner + Claude (delegated).
- Follow-ups: a step 5 opened again later (a fresh load) knows the own group only while it's called «New services»;
  renamed, it's an ordinary group and «Add service» starts a new «New services». Escape in «Add group» or «Rename
  group» also closes a service's drawer open beside the page (from 1280: Radix hears Escape on the document first). No
  duplicate-name check for groups (the api has none either).
