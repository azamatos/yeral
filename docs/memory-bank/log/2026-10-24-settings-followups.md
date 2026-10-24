# Settings follow-ups: the switcher, CopyField on phones, the team step's focus (fix/settings-followups)

- **Switching workspaces keeps the settings section:** `sameSectionIn` gives a `Target` with `part` for Settings
  (`/w/glow-studio/settings/hours` → `/w/glow-nails/settings/hours`, every workspace has the same sections), never
  what's under it (a team member) or what isn't a section; `targetRoute(target)` is the typed route the switcher, the
  `/w/$slug` redirect and the shell's `<Navigate>` all use, so a foreign workspace's address keeps it too. The list of
  sections moved to `@/shared/config` (`SETTINGS_SECTIONS`, `isSettingsSection`); `@/widgets/settings-frame`
  re-exports it. A level without Settings still lands on the calendar.
- **CopyField** (`@yeral/ui/copy-field`, the field variant): on a phone the field takes the row and the buttons go
  under it (B-Settings `.lrow`), so «Copied» (wider) never moves them; wider screens keep them beside the field
  (B-Onboarding `.linkf`). Story `WithSharePhone`.
- **The wizard's team step:** «Add a team member» puts the focus in the new row's name; removing a row moves it to the
  next row's name, else the one before, else «Add a team member» (#173's review; a ref per row, a typed target).
  Story `TeamFocus`.
- Review (one round) also found, left: switching workspaces drops a section's unsaved edits without asking (as any
  navigation does today); the hours step's «Remove break» and the services step's «Add a service» don't move the focus
  yet (a shared helper for list editors would cover them); a shared fake api for Settings' stories; deriving the
  Permissions cells from `PERMISSION_TABLE`.
