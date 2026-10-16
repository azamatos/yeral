---
'@yeral/api': patch
---

Sturdier api hosting: an error before the database is ready still answers with the JSON error body and is logged; on Workers a request connects to the database only when it needs it, the minute jobs never run twice at once and log their failures, and a deploy without an environment fails loudly; behind nginx a client can no longer fake its IP address for the rate limits.
