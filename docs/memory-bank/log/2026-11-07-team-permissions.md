# 2026-11-07 · Team and permissions (design v0.7 · B9)

Branch `feat/team-permissions`. The owner's review (04.11, #29 and #30): «How did we add this Management? I don't see a
way of creating such a role» and «the way of showing roles and actions looks unreadable, admin's description is on 3
rows». Built from `docs/design/screens/business/B7-Team.dc.html` (B9) and `business/README.md` §29.2.

## What's there

- **Settings › Team is one table** (`pages/settings-team/ui/settings-team-page.tsx`): Name · Access level · Takes
  bookings · Services · Hours · Status, on the `@yeral/ui` Table primitives, the pane `wide`. No «Management» group:
  whoever has at least one service takes bookings (✓ / —, the header's ⓘ says so), the owner and admins too. Names on
  one line (truncate; the job title in a tooltip), 56 px rows; the invites and the removed people are rows of the same
  table, sorted active → invited → removed. One `Pill` per row with a 6 px dot: Active · Doesn't use the app · Invited ·
  until 13 Nov · Expired / Declined / Cancelled / Removed / Left · date (slate). The owner's row action: Reactivate
  (icon), Resend invite (icon, an ended invite), Invite again (icon, someone who left with nothing ahead), or the «…»
  menu of an open invite (Copy invite link · Resend · Cancel). Search (name, or 2+ digits of a phone), Access level
  and Takes bookings filters, Clear, «N people». Under 768: list items (avatar 36, name + level, job · services, the
  pill when it isn't Active).
- **Member page footer**: Cancel · Save on the right beside the owner's «Remove from the team» (Danger quiet, left).
- **Settings › Permissions is a matrix of symbols** (`pages/settings-permissions`): `model/rows.ts` cells are
  `yes | no | own | view` with `notes` (footnote 1–4 per level) and `about` (the row has an ⓘ); the key above the
  table, three equal columns, rows 48, the footnotes under it, the «People who don't use the app…» line last. Under
  768 one card per action with Owner / Admin / Specialist rows and the card's own notes.
- **`@yeral/ui` InfoTip** (`packages/ui/src/components/info-tip`, Overlays/InfoTip): the ⓘ button (16, n-500 → n-900)
  and its 280 popover, click-to-open, Esc returns the focus.
- Stories: Team Owner (the table, the ⓘ), LongName, Filtered, Phone (list items), the invite and remove flows re-pointed
  at rows; Permissions Owner (symbols, a footnote, the ⓘ), Admin (View + note 4), Phone (cards).

## Left for later

- Drag ⠿ to order the people clients see (the board draws it; the api has no order endpoint — «no api change» here).
- «Add a teammate» in the toolbar as the board draws it stays the page header's «Add a team member».
- The Status pill with an action on 390 squeezes the second line's job text on narrow names; the board accepts it.
- Turkmen and Russian strings: `apps/business/messages` has English only (ADR 0022: the market's languages at launch).
