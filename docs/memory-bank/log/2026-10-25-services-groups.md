# Services groups you can tell apart, and name (feat/services-group-blocks)

- Changed (the owner's test of business.yeral.app, 25.10.2026): Settings → Services
  (`pages/settings-services/ui/settings-services-page.tsx`) and the wizard's step 5 (`pages/setup/ui/services-step.tsx`)
  show each group as a card: `rounded-card` border, a `bg-group` band with the name and the count (Settings) or «Select
  all» / «Clear» (the wizard) and the menu, the services under it, 16 px between groups, the columns' heading once above
  with the cards' inset. B-Services and B-Onboarding draw a header row instead; the owner's request wins (chapter 9).
- Changed: the wizard's group names are fields like the service names (`GROUP_NAME_MAX` 60, `original` on
  `ServiceGroupRow`, `servicesProblem` → `groupName`, «Name each group.»); `servicesInput` sends a group's name only
  when changed. After a save the own group is found by the name the owner gave it, so «Add service» keeps adding there.
  Settings → Services: «Rename group» in a group's menu (`RenameGroup`, `sdk.settings.renameGroup`, the name over the
  reader's language with the market's others kept through `written()` from `model/service-form.ts`); the menu closing
  leaves the focus in the box, and Save or Cancel gives it back to the group's menu.
- Decided: chapter 9, 25.10.2026, B-38 / B-04 (how), owner + Claude (delegated).
- Follow-ups: reopening step 5 later (a fresh load) finds the own group only while it's still called «New services»;
  renamed, it's an ordinary group and «Add service» starts a new «New services» (the owner can rename that too). No
  duplicate-name check for groups (the api has none either).
