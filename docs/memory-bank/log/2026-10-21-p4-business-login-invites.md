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
  level gives its scope (the desk's for an Administrator, their own for a Specialist); no replacement line when false.
- Tests: `entry.test.ts` (the week's edge), stories `Business/Access/LoginFlow` (accepted → calendar at once; two
  invites one after another, the Admin's without the requests line; a member's decline confirmed; expired masked;
  expired over a week ago → no workspace).
- Waiting: the unfinished-setup card (Q-200, B-Login `step=setup`) comes with the api's `GET /v1/me/setup` (#112).
