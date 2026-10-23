# The setup wizard's done step (P4 slice 2, step 8; feat/ui-checklist-qr #168, feat/setup-done)

- Changed (#168, `@yeral/ui`): **Checklist** (`Display/Checklist`: heading + count from the items + ProgressBar's new
  `meter` variant, 28 markers done / current / todo, `role="list"`), **QrBlock** (`Display/QrBlock`: the code drawn
  in the browser with **lean-qr**, added to the catalog; card 200 / compact 120; PNG ≥ 1200 px and SVG downloads with a
  4-module quiet zone, the screen keeps 2; a status line per download), **CopyField** (`Inputs/CopyField`: the
  read-only 44 field with Copy → «Copied» 2 s and a Share menu of links, or an inline value; a refused clipboard
  selects the full value). lean-qr is in `techContext.md`.
- Changed (the step): `pages/setup/ui/done-step.tsx` (`useDoneStep`, on the frame's pattern) and `model/done.ts`
  (`qualityOf`, `hasAbout`, `shareLinks`, `firstMissing`, tested): «{name} is ready!», the in-review callout, the
  switcher note for someone who came from another workspace, the card clients will see (the first gallery photo, the
  category and the address or «approximate area shown»), the page link with Copy and Share (WhatsApp, Telegram), the
  compact QR with its downloads, «Make your page stronger». The footer's primary on the last step is «Go to the
  calendar».
- Decided: chapter 9, 23.10.2026, B-06 / F-097 (how). A finish tells the wizard first (`onFinished`, before the
  sdk's refresh, the events feed or another tab finds the draft gone) and empties the draft in the cache; the wizard
  then opens the workspace's calendar (or Settings) instead of a new draft. A done step whose draft is gone (finished
  in another tab) goes to the app's start. `clientHost` and `pageLink(slug)` moved to `@/shared/config`.
- Follow-ups: «Send invites» on this step with the team step (6); the checklist's «Add» opens Settings' section page
  until Settings → Business profile is built (then a link to its logo, photos and About); finishing needs a service, so
  until the services step is built a draft's finish sends the person to step 5.
