# Settings → Permissions (P4 slice 2; feat/settings-permissions)

- `pages/settings-permissions`: the fixed read-only table (design §28.1 «Fixed permissions», B-Team
  `tab=permissions`): What · Owner · Admin · Specialist, the board's 13 rows (`model/rows.ts`), a check (Yes), a dash
  (No) or the narrower reach in words («Own earnings only», «View only»); ARIA table roles on a grid
  (`minmax(0,1fr) 72 88 minmax(160,248)`), under 768 each row stacks with the levels' names. The lead links to Team;
  the caption says specialists without the app never sign in.
- A test keeps the rows that are `@yeral/domain/permissions` rows in step with `PERMISSION_TABLE` (none → No, all /
  manage → Yes, own / view → words). Editing permissions stays Later (F-089).
- Built on the settings frame (`log/2026-10-24-settings-frame.md`); story `Business/Settings/Permissions`.
