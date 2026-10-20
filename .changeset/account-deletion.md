---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
---

Deleting an account deletes its reviews too, and the businesses' ratings no longer count them (book Q-172); a
`review.deleted` event tells open screens, and the sdk refreshes that business's reviews and page.
