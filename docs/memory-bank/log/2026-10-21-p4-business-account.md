# My account in the business app (feat/p4-business-account)

- Changed: P4 slice 1 (Accounts), PR 3, stacked on the shell (#119). Book B-12, B-13, B-15, Q-156; B-Shell "My
  profile", "Change number · expands in place", "Leave Glow Studio?"; DS-Business 09 (ProfileDrawer, ChangePhone,
  LeaveConfirm).
- Built on #118's `useCodeSteps` (`@yeral/features/auth-by-phone`, cherry-picked here as its own commit, `e233001`;
  it drops out when #118 lands): the number change runs the sign-in's steps, waits and refusals over
  `me.phoneCode` / `me.phoneVerify`.
- `widgets/workspace-shell` (Steiger keeps one-user slices out, so the drawer and its features live in the shell):
  - `ProfileDrawer` (account menu "My profile" and the More sheet's row; Drawer `scrim="auto"`): first and last name
    (Q-156: two fields, the last optional; the board's single field gives way to the book) saved with Save (toast
    "Saved", the drawer closes; unchanged closes at once); `ProfilePhoto`; `ChangePhone`; My workspaces (logo, name,
    level); the owner's box "You're the owner of {business}, so you can't leave it. To close this workspace, contact
    Ýeral." (no link while Contact Ýeral has no phone or Telegram) or "Leave this business" (danger-ghost).
  - `ChangePhone`: read-only number + "Change number" only when `me.canChangePhone` (hidden otherwise, as anything a
    person can't use, and the hint drops its second sentence); in place: SignInCodeStep `inline` (new number → code on
    the screen, boxes 48, "To change to …", "Until the new number is verified you can log in with the old one.");
    `phone_taken` → back on the number with "This number is used by another account"; `phone_change_unavailable` (the
    fallback when `canChangePhone` was stale) → its words as a toast, the box closes; done → toast "Phone number
    changed".
  - `LeaveConfirm` (Modal 400, focus on Cancel, danger "Leave {business}"): `team.leave`; `not_found` counts as left;
    other refusals toast (the owner never sees it). The shell then opens the last used other workspace, else the sign-in
    ("You don't have a workspace yet").
  - `ProfilePhoto`: the avatar 64 (one letter) and, once the api takes photos, "Add photo"/"Change photo" with the
    states uploading, too big (10 MB, as the business photos), not a photo (JPG or PNG); built and in stories with a
    fake upload; the drawer passes no upload yet.
- `@yeral/ui`: Button `danger-ghost`; Drawer head 19/24 600 (the board's rich heads) and `scrim="auto"` (from 1280 no
  scrim, not modal, not dismissed by the page beside it); SignInCodeStep `layout="inline"` + `copy.cancel`/`onCancel`;
  AccountMenu item `opensDialog` (the menu doesn't take the focus back from the drawer it opened).
- How (for the book): the name is two fields (Q-156 over the board's one); Save closes the drawer with "Saved" (the
  save bar's toast); "Change number" is hidden, not disabled, without `canChangePhone`; the leave text has no counts
  ("Your bookings and requests stay with the business — the owner will choose who takes them."); after leaving, the
  last used other workspace opens directly (no "Opening …"); the photo's limit is the business photos' 10 MB.
- Gaps for the backend: the person's specialization per workspace (My workspaces shows the level only; B-12 step 5);
  the count of the person's bookings and requests ahead in the workspace (the leave text's numbers); the photo upload
  is #116 (`PUT /v1/me/photo`, `me.photo`): wire `ProfilePhoto`'s `upload` and `src` once it lands.
- Checked: stories (owner, no first name, change number, taken, unavailable, a specialist leaving, phone width; the
  photo's six states; SignInCodeStep inline ×6; Drawer scrim ×2); in the browser against the local api at 500: Aýna
  left Glow Studio from My profile on the phone → "You don't have a workspace yet" (`staff.status` removed); Maýsa
  changed her number with the code → toast, row closed, the new number on screen.
