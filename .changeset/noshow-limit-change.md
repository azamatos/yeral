---
'@yeral/api': patch
---

A stricter no-show limit doesn't reach back: clients it doesn't block start their count again, clients already
blocked stay blocked; a looser limit applies at once.
