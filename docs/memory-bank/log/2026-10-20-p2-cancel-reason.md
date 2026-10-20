# The cancel reason setting (feat/p2-3-cancel-reason)

- Changed: P2 step 3 (book Q-163). The client's booking detail carries `askCancelReason` (the business's
  "Ýatyrylanda sebäp sora"), so the cancel modal shows the reason chips (still optional) or no reason section; a reason
  sent to a business that doesn't ask isn't kept.
- Follow-ups: the design draws the modal without the reason section (07a C-28); the business's settings screen
  (step 4) changes the switch.
