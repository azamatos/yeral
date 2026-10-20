# The four undo reasons (feat/p2-3-undo-reasons)

- Changed: P2 step 3 (ROUND6 A6). `canClientRestore` (`@yeral/domain/lifecycle`, with `RESTORE_MINUTES` moved there)
  is the one rule for the "Yzyna al" flag and the action: not the client's cancel or a second tap `invalid_status`,
  the 5 minutes passed `restore_expired`, the visit started `already_started`, a request's answer time ran out
  `request_expired`; the time taken (`slot_taken`) and a full class (`session_full`) come when it's put back. The flag
  stays on for a request whose answer time ran out, so the tap names the reason.
- A request brought back counts as a new one: the waiting limit (Q-124) and a business no longer taking it online
  (`online_disabled`, `online_blocked`) refuse it; a confirmed booking comes back whatever the business did since.
- `@yeral/i18n`: `undo.failed` ("Yzyna alyp bolmady — {reason}.") and `undo.reasons.{code}` in en, tk (the design's
  words) and ru; other refusals show their `errors.{code}`.
- Follow-ups: the client app shows them with "Başga wagt saýla" (P4); the strings move to the client app's own
  messages if only it uses them.
