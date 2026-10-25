# The owner's first look at business.yeral.app: three `@yeral/ui` fixes (fix/ui-owner-feedback)

- Changed: **Button**: a disabled button of any variant is DS-Components `.b:disabled` (#f0f0f3 background and border,
  #6e6e78 text, no shadow). The primary's `bg-primary` is a gradient (a background image), which `disabled:bg-n-100`
  didn't cover, so a disabled Continue showed purple with grey words; `disabled:bg-none` drops it, and Tailwind sorts
  the `disabled` variant after `hover` and `active`, so neither brings it back. Story `Disabled` checks four variants'
  computed colours.
- Changed: **Toast**: 16 px on both sides, 8 on the right only beside an action (`has-[[data-button]]:pr-2`, sonner's
  attribute on its buttons), so «Saved» sits centred. `Undo` and `ShellOffset` check the padding.
- Changed: **Select**: tabular figures only with `tabular` (TimeRangeField's time pickers, where a column of times lines
  up); other selects keep Onest's proportional figures, as its tabular «1» left a gap in «10 min». `Sizes` checks both.
- Follow-ups: none.
