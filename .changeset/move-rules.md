---
'@yeral/api': minor
'@yeral/contract': minor
---

Moves follow the book (Q-165, Q-263, ROUND6 A3, A5): a new time may overlap the booking's own with the same specialist
(the free times in move mode come with `?move={code}`), a move goes only to the chosen specialist, a waiting move never
outlives the original visit, and a second move can be asked while one waits.
