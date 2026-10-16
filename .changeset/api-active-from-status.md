---
'@yeral/api': patch
---

A booking's `active` flag is computed by Postgres from its status (and copied to its items by a trigger), so the no-overlap constraints follow every status change, whoever makes it.
