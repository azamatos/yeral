---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
'@yeral/sdk': minor
---

The admin tool's businesses (book F-179, S-17): the queue to review, a business to check, verified or sent back with a
reason (a live one un-verified), hidden from visitors with a reason and shown again, a move checked again; the owner
sends a business back for review once fixed, and hears every result on screen and by an SMS that never goes at night.
Migration 0036 adds `businesses.sent_for_review_at`, `hidden_at` and `hidden_reason`.
