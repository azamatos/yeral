# 2026-10-21 · The switcher's workspaces: state, specialization, reviews to answer

- `GET /v1/me/workspaces` items gain `status` (`live` · `in_review` · `not_approved` · `hidden` · `demo`; `pageStateOf()`), its
  `statusReason` (the Ýeral team's words, to the owner and administrators only), the person's `specialization`
  (null: "Not set") and `reviewsToAnswer` (unanswered, not removed; for those who reply, 0 for a specialist; one
  grouped query for every workspace). `WORKSPACE_STATUSES` in `@yeral/contract/team`.
- The business app: the muted Reviews count in the sidebar and in More. The banner comes with slice 2.

Review (one round): the Reviews count refreshes with review events and the reply mutations (`keys.workspaces()`);
one `pageStateOf()` beside `publicRow` (exhaustive, `demo` first) and one `unansweredCounts()` for the page and the
switcher; `levelCan()` for the permissions; `all()` for the queries; a plural-ready message; stories with the count;
tests for an administrator, a reply and its removal, and `demo`. Left as they are: the reason to administrators (they
can fix what it points to; the app offers "send again" to the owner only); "in review" in the pilot (the app words it
from `/v1/auth/mode`); the invite-accept route reading every workspace (from before; a follow-up).
