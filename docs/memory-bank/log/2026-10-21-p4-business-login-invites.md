# The login's invites as decided (fix/p4-login-invites)

- Changed: P4 slice 1 (Accounts), the review of the merged login (#102) against the book's 21.10.2026 rows (chapter 9:
  B-07/F-083/Q-200 and B-08/F-085 "how"). `apps/business/src/pages/login` only.
- After an Accept (`entry-step.tsx`): the invites have reloaded by the time the answer lands (the sdk's accept awaits
  them), so another waiting invite shows next; with none left, the joined workspace's calendar opens at once (no
  "Opening …" card). The api's accept already makes it the last used (`lastOpenedAt`), so no `team.open` call.
- A decline by someone who has a workspace: the opening card carries the same "You declined {business}'s invite."
  line as the no-workspace card (`DeclinedLine`, shared by both).
- The expired card (`entry.ts`, `EXPIRED_CARD_MS`): only for 7 days after the invite ended, then "You don't have a
  workspace yet" (which can create a business); the person arrives once (`now` from the entry step's first render).
  The number on it is masked, as on the invite card.
- The invite card's requests line (`invite-step.tsx`): shown only when the card's `answersRequests` (#109) is true; the
  level gives its scope (the desk's for an Administrator, their own for a Specialist). When false an Administrator's
  card says "You can reply to reviews" (book chapter 3: administrators answer reviews; the concern below, answered by
  the lead) and a Specialist's has no line there (they only read reviews about them).
- Tests: `entry.test.ts` (the week's edge), stories `Business/Access/LoginFlow` (accepted → calendar at once; two
  invites one after another, the Admin's with reviews only; not answering requests (Admin, Specialist); a member's decline confirmed; expired masked;
  expired over a week ago → no workspace).
- Review (12 findings; 8 fixed): the accept path keeps its own record (`answered` ids filtered out at once, `joined`
  slug) so a failed refetch can't bring the accepted invite back and nothing hangs on the sdk awaiting its
  invalidation; with nothing else waiting it renders `<Navigate replace>` to the joined calendar (the opening card's
  navigation is `replace` too: no Back loop to the sign-in); accept one, then decline another → the decline is the
  latest answer and is confirmed on the card that opens the joined workspace (a "how"); the stories prove "at once"
  (the calendar within 1 s, before the 1.5 s card could), the fake accept makes the joined workspace current as the
  api does; the week is `EXPIRED_INVITE_SHOWN_DAYS` / `showsExpiredInvite()` in `@yeral/domain/team` (`<`, as the other
  day rules); `DeclinedLine` has its own file; a failed `/me` refetch no longer replaces the screen with "Something went
  wrong" while the person is known. Not taken at first: the Admin's reviews line when `answersRequests` is false
  (raised as a concern; the lead then pointed to chapter 3's "Reply to reviews | yes", so it's built), the server deciding the expired
  card's week (one clock; suggested to the backend), editing the book's Code differs lines (the lead clears them).
- Waiting: the unfinished-setup card (Q-200, B-Login `step=setup`) comes with the api's `GET /v1/me/setup` (#112).
