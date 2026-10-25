# The owner's first look at business.yeral.app: three `@yeral/ui` fixes (fix/ui-owner-feedback)

- Changed: **Button**: a disabled button of any variant is DS-Components `.b:disabled` (#f0f0f3 background and border,
  #6e6e78 text, no shadow). The primary's `bg-primary` is a gradient (a background image), which `disabled:bg-n-100`
  didn't cover, so a disabled Continue showed purple with grey words; `disabled:bg-none` drops it, and Tailwind sorts
  the `disabled` variant after `hover` and `active`, so neither brings it back. Story `Disabled` checks all eight
  variants' computed colours.
- Changed: **Toast**: words alone («Saved») get DS-Patterns `.toast.plain`, 16 left and 20 right (they had `.toast`'s
  8, kept for an action); an action pulls itself 12 into the padding (`-mr-3`), so it still ends 8 from the edge.
  `ShellOffset` checks 16 / 20, `Undo` the action's 8.
- Changed: **Select**: tabular figures only in the 40 size (time pickers, DS `.y-tsel`, which TimeRangeField uses;
  its story checks them); the 48 and 44 keep Onest's proportional figures, as its tabular «1» left a gap in «10 min».
- Departs from the board (the owner, 25.10.2026): B-Onboarding draws the wizard's selects (`.sel`) with tabular
  figures; they're proportional now, as B-Settings' `.isel` already is.
- Follow-ups: a time picker still shows Onest's tabular «1» (10:00, 21:30), kept so the week's columns line up; one
  shared disabled look for a Button that is `aria-disabled` (not `aria-busy`), instead of each caller's own
  (`booking-statuses.tsx` uses `opacity-50`); WizardFooter's Back and SaveBar's Discard override `disabled:bg-transparent`
  and keep the #f0f0f3 border while disabled.
