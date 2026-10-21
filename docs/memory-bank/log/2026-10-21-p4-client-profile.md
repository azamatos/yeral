# The client's profile, P4 slice 1 (feat/p4-client-profile)

- Changed: book C-43 (the name), C-44 (the phone), C-46 (log out), C-47 (delete the account; Q-172's copy); the
  Account-Profile board (profile pane and the client account aside).
- `/{lang}/account` (`ssr: false`): someone signed out goes to `/{lang}/login?redirect=…` and comes back (book C-40);
  the account layout (`widgets/account-layout`): avatar 56, the name and phone, the account's places (Profile and
  settings now; My bookings and Favourites with their slices) and Log out; under 1024 a row of pills without the
  person and Log out (the header's menu has them).
- `/{lang}/account/profile` (`pages/account-profile`): «Personal details» (first name required: «Enter your first
  name.», last name; `PATCH /v1/me`) with the new `@yeral/ui` SaveBar (Discard · Save, «Changes saved»); the phone,
  read-only; «Change» only when `me.canChangePhone` (#109; false while the sign-in code shows on the screen), then the
  new number and its SMS code in the shared code step (`POST /v1/me/phone/code`, `/verify`; `phone_taken` under the
  field; `phone_change_unavailable` from the api after all: a toast and «Change» goes); «Account»: Log out (goes Home
  from the account area) and Delete account (480 modal with Q-172's words, Back and the solid danger «Delete account»;
  `DELETE /v1/me`; an owner of a business sees why it can't: `owns_workspace`; done: Home and a toast).
- The header's avatar menu gains «Profile» (and its phone sheet); `features/log-out` (`useLogOut`, one log-out at a
  time across its triggers) is shared by the menu, the aside and the page. The account layout sends anyone no longer
  signed in Home (a log-out anywhere, the account deleted, the session ended elsewhere).
- Review of PR 3 (#118), fixed: `phone_taken` at the code goes back to the number, which says so; the account's own
  number is refused before a code («This is already your number.»); Cancel waits while a code is checked; the name
  form keeps only what was typed (a rename elsewhere shows, never saved back) and says «Enter your first name.» only
  once the name changes; the focus goes back to «Change» (or the number), and to the name after Save or Discard;
  `/{lang}/account` opens the profile; the code step's wiring is the site's `CodeStep` (`shared/ui`, the login uses
  it too) and the person's mark `PersonMark`; the SaveBar story clicks Save to submit its form.
  Not taken: TanStack Form (no `@yeral/ui/form` layer yet; the business app's forms are plain state too).
- `@yeral/features/auth-by-phone`: `useCodeSteps({ sendCode, verify, onVerified, onFailed, done })` runs the code steps
  against any pair of requests (the sign-in, the phone change); `useSignIn` is it with the sign-in's.
- `@yeral/ui`: `SaveBar` (Overlays/SaveBar: Dirty, Invalid, Saving, submits a form, Phone, Russian length).
- Decisions ("how", for the book's chapter 9):
  - No Language section and no language row at the first launch (one language); no SMS switches (C-45) while no SMS
    reaches a phone (Q-036): both join with the Turkmenistan launch.
  - «Change» is hidden, not disabled, when `canChangePhone` is false (nothing to explain to a client at the first
    launch); a 409 from the api still hides it, with the error's words in a toast.
  - The delete modal says «Your upcoming bookings will be cancelled» without a count (the board's «3»): nothing in
    the api counts them yet.
  - After deleting: Home and «Your account is deleted.»; after saving the name: «Changes saved» (no success icon:
    the Toast's Success tone isn't in `@yeral/ui` yet).
  - The aside lists only pages that exist (Profile and settings), like the header's menu.
- Tests: stories `Client/Pages/AccountProfile` (11: first launch without «Change», edit the name with an empty first
  name, Discard, change the number with a taken number, the api refusing the change, cancel, delete with Back, delete
  refused for an owner, log out, phone, long names), `Overlays/SaveBar` (6). End to end against the local api
  (Chrome): signed out → login → back to the profile; the name saved; log out → Home; a new test account deleted.
- Gaps for the backend: a count of the bookings a delete would cancel (the modal's number); `canChangePhone` covered the
  rest.
