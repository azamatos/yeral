---
'@yeral/api': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

An undo ("Yzyna al") that fails says why (ROUND6 A6), one error per reason: the time was taken (`slot_taken`), the class
is full (`session_full`), the visit has started (`already_started`), the answer time ran out (`request_expired`); past
the 5 minutes `restore_expired`, a second tap `invalid_status`. A request brought back counts as a new one (the waiting
limit, a paused business). `canClientRestore` holds the rule; `undo.failed` and `undo.reasons` hold the texts.
