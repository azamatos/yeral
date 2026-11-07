# 2026-11-07 — the owner's three UI findings on the live client site

The owner's screenshots of 07.11: the Account section's two actions looked unbalanced and «Log out» asked nothing;
rating stars were ink while the brand has its accent; a past booking's row on My bookings looked scattered.

## What changed

1. **Account section** (`apps/client/src/pages/account-profile/ui/account-profile-page.tsx`): two even rows on the
   SettingsRow's values (title 15/22 500 + one line 13/18 on the left, the M button on the right, a divider between,
   stacked with the button full width under 768): «Log out» Secondary and «Delete account» danger-quiet (was S). Both
   ask first. The new `LogOutConfirm` (`features/log-out/ui`) is the Modal 480 confirm as `delete-account.tsx`:
   «Log out of Ýeral on this device?» · Cancel · Log out (primary; a failure keeps the dialog and the toast says why).
   It's the one question wherever a client logs out: the account page, the account aside, the header's menu and its
   phone sheet (the row closes its menu and hands the focus to the dialog; Cancel gives it back to the avatar). The
   business app asks the same (`widgets/workspace-shell/ui/log-out-confirm.tsx`) from the sidebar's account menu
   (`opensDialog`) and the More sheet; the sign-in pages' «Log in with another number» stays as it was (it names what
   it does). New strings: client `account.logOutTitle|logOutCancel`, `profile.logOutLead`, a one-line
   `profile.deleteLead`; business `shell.account.logoutTitle|logoutCancel`.
2. **Stars** are `a-500` everywhere (6.2:1 on white; the boards and `COMPONENTS.md` drew them ink): `Rating`, `Stars`
   (so the reviews summaries, the result rows and tiles, the booking steps, the business app's reviews page and its
   report modal), `RatingInput` (filled a-500, the star under the pointer and the pick on the a-50 tint instead of the
   grey box; the unpicked outlines stay n-500 — a control's line needs 3:1, n-300 gives 1.4), the business hero's star
   on white (white with the rest on the photo), the setup's «New» card. `RatingDistribution`'s bars were already a-500.
   Noted in `.claude/skills/design-system/SKILL.md`.
3. **My bookings rows** (`booking-row.tsx`, `my-bookings-page.tsx`): the live row matched Account-Bookings' `.brow`
   (photo 96 · text · price and actions at the right), so the card is the improvement on the nearest drawn pattern: a
   bordered card (n-200, r16, pad 16), 12 apart; the photo 64 (the Mobile board's) beside the name with the status
   badge at the right; «service · specialist · price»; the date line; what the status means now and the reason under
   it; a footer under a line with «You rated ★ 4» on the left (the message is now «You rated» + the Rating) and the
   actions on the right (Call / Undo Tertiary, Write a review and Book again Secondary, Edit the review Tertiary);
   under 768 the footer stacks and the actions take the width. Upcoming and past rows are one pattern. Stories:
   Upcoming, Past, Reviewed, Phone (390, upcoming), «Phone, past» (390: rated, not rated, cancelled).

## Left

- The business reviews page's filter chips («4 ★») keep the chip's own colour: a filter label, not a rating.
- Turkmen and Russian for the new strings come with the translation run.
