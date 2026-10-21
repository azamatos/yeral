# 2026-10-21 · The switcher's workspaces: state, specialization, reviews to answer

- `GET /v1/me/workspaces` items gain `status` (`live` · `in_review` · `not_approved` · `hidden`; hidden wins), its
  `statusReason` (the Ýeral team's words, to the owner and administrators only), the person's `specialization`
  (null: "Not set") and `reviewsToAnswer` (unanswered, not removed; for those who reply, 0 for a specialist; one
  grouped query for every workspace). `WORKSPACE_STATUSES` in `@yeral/contract/team`.
- The business app: the muted Reviews count in the sidebar and in More. The banner comes with slice 2.
- Next: `demo` for the sandbox business once #143 (F-242, `businesses.sandbox`) is merged.
