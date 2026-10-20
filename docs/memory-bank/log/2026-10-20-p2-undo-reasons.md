# The four undo reasons (feat/p2-3-undo-reasons)

- Changed: P2 step 3 (ROUND6 A6). "Yzyna al" that can't bring a booking back says why, one error per reason:
  `slot_taken` (the time was taken), `session_full` (the class is full), `already_started` (the visit has started),
  `request_expired` (the request's answer time ran out); past the 5 minutes, `restore_expired`. `@yeral/i18n` has
  `undoFailed` ("Yzyna alyp bolmady — {reason}.") and `undoReasons.{code}` in en, tk (the design's words) and ru.
- Follow-ups: the client app shows them with "Başga wagt saýla" (P4).
