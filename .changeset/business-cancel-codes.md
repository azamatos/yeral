---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
---

A business's cancel reaches the app as a code it words: the booking detail and the SMS link page add `businessCancel`
(`{ reason, text }`, with the business's words for "Other reason" or the closed day's name), and `cancelReason` holds
only the client's own words. The free times offered when a business closes over a booking are taken with their own
source, `cancel` (`accept-alternative`), no longer `decline`.
