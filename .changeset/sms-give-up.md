---
'@yeral/api': patch
---

SMS that fail (book Q-284): a reminder whose retry comes once the visit has started is dropped, not sent late; a job
that fails for the fifth time writes the error line `job gave up`, for error tracking to alert the team on.
