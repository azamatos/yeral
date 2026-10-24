# Settings follow-ups: the switcher, CopyField on phones, the team step's focus (fix/settings-followups)

- **Switching workspaces keeps the settings section:** `sameSectionIn` gives `part` for Settings
  (`/w/glow-studio/settings/hours` → `/w/glow-nails/settings/hours`, every workspace has the same sections), never
  what's under it (a team member); the switcher goes there by `href`. A level without Settings still lands on the
  calendar.
- **CopyField** (`@yeral/ui/copy-field`, the field variant) wraps: on a phone the buttons go under the field (B-Settings
  `.lrow`); story `WithSharePhone`.
- **The wizard's team step:** «Add a team member» puts the focus in the new row's name; removing a row moves it to the
  next row's name, else the one before, else «Add a team member» (#173's review). Story `TeamFocus`.
- Left (noted, not done): a shared fake api for Settings' stories; deriving the Permissions cells from
  `PERMISSION_TABLE` instead of a checked copy.
