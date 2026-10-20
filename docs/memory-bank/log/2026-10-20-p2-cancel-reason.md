# The cancel reason setting (feat/p2-3-cancel-reason)

- Changed: P2 step 3 (book Q-163). The client's booking detail carries `askCancelReason` (the business's
  "Ýatyrylanda sebäp sora"), so the cancel modal shows the reason chips (still optional) or no reason section; a reason
  sent to a business that doesn't ask isn't kept, nor a blank one (`keptCancelReason` in `@yeral/domain/lifecycle`). A
  booking brought back with "Yzyna al" leaves its cancel reason behind (`setStatus`).
- Known: the reason is free text (the client sends the chip's words in its language); codes with translated labels,
  like decline reasons, would let a business read and count them in one language: with the business screens
  (step 4). The rules are read before the cancel's lock, as the cancel window always was.
- Follow-ups: the design draws the modal without the reason section (07a C-28); the business's settings screen
  (step 4) changes the switch.
