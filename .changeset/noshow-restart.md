---
'@yeral/api': minor
'@yeral/domain': minor
---

The phone-only limit restarts (book Q-127): when the business turns a client's block off, only no-shows marked after
that count toward the limit again. Removing a wrong no-show or setting the limit to 0 still lifts a block that came
from the count; one set by hand stays.
