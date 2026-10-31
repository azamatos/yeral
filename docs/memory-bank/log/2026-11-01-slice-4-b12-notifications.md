# Notifications in the business app (P4 slice 4, PR B12; feat/business-notifications, #268)

Slice 4's B12 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes", D1 = A, decision 7): what the workspace says
about a request while a tab of it is open (book B-16 step 9, S-16, F-123, F-170; boards B-Shell «notifications» 5–6
and the arrival toast, DS-Business 07). No web push, no settings page: the native apps' and F-169's parts.

- **`shared/lib/browser-notifications`** (`apps/business/src/shared/lib/browser-notifications`; techContext "Where
  shared things live"): one door to the browser's notifications and the soft sound, `BrowserNotifications` —
  `permission()` (`default | granted | denied | unsupported`, the last for a browser without `Notification` or an
  insecure page: an iPhone outside an installed app), `request()` (the browser's own prompt), `show({ title, body,
  tag, onClick })` → whether one was shown (the click focuses the tab, closes the notification and runs `onClick`; not
  allowed, or a browser with notifications only through a service worker, Chrome on Android, → false and the caller
  toasts instead), `sound()` (`/sounds/new-request.wav`, one audio element, a refusal to play without a gesture is
  swallowed), `hidden()` (`document.hidden`), `blockedBannerClosed()` / `closeBlockedBanner()` (the flag
  `yeral.business.notifications.blocked-closed` in `localStorage`), `warningsHeard()` / `markWarningHeard(code)` (the
  newest 50 codes in `sessionStorage`: a reload of the tab doesn't warn again, another tab warns for itself); every
  storage access in try/catch. `createBrowserNotifications(win)` reads the window when asked, never at import (tests
  pass a fake window); `browserNotifications` is the app's. React: `BrowserNotificationsProvider`,
  `useBrowserNotifications()`, `useNotificationPermission()` (follows the Permissions API's `change` where the browser
  has it, and reads again on `visibilitychange`, so a permission changed in the browser's settings is seen). Pure
  rules `warningsDue(items, now, heard)` and `nextWarningIn(items, now, heard)` for the 5-minute warning. **The
  browser's real prompt can't be driven from a story or a test:** `fakeBrowserNotifications({ permission, answer,
  hidden, blockedClosed })` stands in (its `state` records what was shown, played and heard); `PageStory` gives every
  page story a browser that already allowed notifications, so no page story shows the banner or plays a sound unless
  it passes `browser`. Unit tests: `notifications.test.ts` (a fake window), `warnings.test.ts`.
- **The sound** (`apps/business/public/sounds/new-request.wav`, 16 KB): a two-note chime (E5 then A5, sine with a
  faint octave, 8 ms attack, exponential decay, 0.5 s at 16 kHz mono) written by a few lines of Python in this PR's
  session, nothing downloaded, nothing to license. The business site's CSP (`default-src 'self'`) already allows it.
- **`NotificationPermissionBanner`** (`widgets/workspace-shell/ui/notification-permission-banner.tsx`, Storybook
  Business/Shell/NotificationPermissionBanner): `COMPONENTS.md` names the slice `widgets/notification-permission-banner`,
  but the slot it sits in is `WorkspacePage` (the shell's widget), and FSD forbids a widget importing another, so it
  lives beside `InviteNote` in the shell's slice, as the invite note does. Ask: `Callout` accent, bell, «Turn on
  notifications to hear new requests.» (bold, as drawn) + secondary S «Allow» → `request()`; allowed, it goes.
  Blocked: `Callout` neutral, bell-off, «Notifications are blocked in this browser. Allow them in the browser's
  settings.» + ghost icon «Close» → `closeBlockedBanner()`. Allowed or unsupported: nothing. The board writes
  `role="status"`; the banner mounts again with every page, and a note present at mount is static by the Callout's
  rule (a live one would be read aloud on every navigation), so it stays silent. Rendered by `WorkspacePage` under
  `InviteNote`, in the place B-11's business status banners take in slice 6 (the flush wrapper gained `flex-col
  gap-4`). Stories: Ask (Allow → gone), Ask → blocked, Blocked (Close → gone), Blocked closed before, Allowed,
  Unsupported, Ask · keyboard, Phone, Phone · blocked; plus Workspace → «Notifications · ask» showing it in the
  shell's slot under a waiting invite.
- **`RequestArrivals`** (`widgets/workspace-shell/ui/request-arrivals.tsx`, Business/Shell/RequestArrivals): `useSay`
  says a word (`new | move | warn`) about a request — the sound for a new request and the warning, not for a time
  change (book chapter 8, decision 7); the tab hidden → `show()` with the title («New request», «Time change request»,
  «Request time running out»), the body «Ejegyz T. · Aýna · today · 15:30» and the tag `<word>:<code>`; in front, or
  when none could be shown, the toast (`TimerOff` icon for the warning, `Clock` for an arrival) with «Open», both
  opening `/w/$slug/calendar?request=` (`date=` unless today). The arrivals as before (the ones waiting when the page
  opened stay quiet). The warning: `warningsDue` on every list answer and a `setTimeout` to the nearest `warnAt`
  (`nextWarningIn`), so it fires in a background tab too; once per code, remembered by the tab through a reload;
  those who may answer (`canAnswer`); a request already inside its last five minutes when the page first opens is
  warned about once (the person just arrived and it's about to run out). `useJoin` (`entities/booking`) now returns
  the same function while the words stay, so the effects that depend on it aren't rebuilt on every render. Stories
  drive a `fetch` whose list grows on «A request arrives» and read the fake browser: New request · in front (toast,
  sound, Open), Time change · in front (no sound), Already waiting · quiet, New request · background (notification,
  no toast, the click opens), Background · not allowed (toast), Running out · 5-minute warning (not for one the
  person may not answer), Running out · background.
- **Words** in `apps/business/messages/en.json`: `shell.arrival.warn|newTitle|moveTitle|warnTitle`,
  `shell.notifications.ask|allow|blocked|close` (the banner's wording from B-Shell; «Request time running out» from
  `copy/en-choices-business.md`).
- **The book:** chapter 9 gained the decision row (01.11.2026); F-123 and F-170 are built; S-16's status says what the
  app does now. The toasts' 5 s (`Toaster` default) against the book's 6 s is unchanged (outside this piece).

Seen, not in this PR: two open tabs of the workspace both speak (two chimes; the front tab's toast and the back tab's
notification together) — one tab per browser should (a `BroadcastChannel` claim or `navigator.locks`), a small
follow-up. Not in this PR by the plan: quiet hours (S-18), the settings page (F-169), notifications for a cancel, a
review, a colleague's booking or the summaries, web push, notifications to a request's specialist by phone.
