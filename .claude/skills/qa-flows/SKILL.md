---
name: qa-flows
description: Click-test Yeral's critical flows in a real browser with Claude in Chrome — client booking, salon answers, cancel/move/review, favourites, business calendar, phone layouts — and report what broke. Use before a release, after porting or changing a screen, or when the user asks to test the site.
---

# Browser QA

Use the Claude in Chrome tools: open a new tab, never reuse the owner's tabs. Phone checks at 390×844, desktop at 1280×800.
Watch the console (`read_console_messages` with a pattern) for errors on every page. Don't trigger native dialogs.

## Demo facts

- Login: any `+993` number, code `1234`. `+993 65 12 34 56` = demo client with history.
- «Ножницы» (`/nozhnitsy`) waits for the salon's answer; other salons answer by themselves or confirm instantly.
- Reset: profile → «Сбросить демо-данные».
- Local: `apps/legacy` on `http://localhost:3000` today (`pnpm dev`); after the migration landing :3000, client :3001, business :3002, cms :3003,
  api :3004, Storybook :3005 (plus `PORT_BASE` offset in other worktrees). Staging: `*-stage.yeral.app`.

## Flows (expected result in brackets)

The flows below test `apps/legacy`. From M3 the client site follows `docs/design/screens/README.md`: rewrite this list
from it (Home → Search → Business page → appointment / table / class booking → login → my bookings → profile, plus every
state on the States board, at 1440 and 390, in TK, RU and EN).


1. **Discover**: home → category tile → search (list + map pins, day rail changes the free times) → salon card → salon page
   (photos, services, team, reviews, hours, map) [no empty sections, times in the future only].
2. **Book, any master**: salon → «Записаться» → service → «Любой мастер» → time (shows who is free) → confirm →
   phone login inline → send [request screen; status «ждёт подтверждения»].
3. **Salon answers**: on «Ножницы», answer the request (business app, or the demo panel today): confirm / decline with
   reason / propose another time [client screen updates without reload; proposal can be accepted or declined].
4. **Cancel**: my visits → booking → cancel with reason [free before the deadline, «поздняя отмена» after].
5. **Move**: booking → move → new time [new request; the old slot stays until the salon answers].
6. **Review**: a done visit → leave a review → edit it → it shows on the salon page.
7. **Favourites, notifications, profile**: heart on a card → favourites page; bell → click-through to the booking; edit profile.
8. **Direct link**: open `/{slug}` in a fresh session and book [channel `direct` recorded].
9. **Phone layout**: flows 1–2 at 390 px [no horizontal scroll, sticky CTA visible, sheets instead of dialogs].
10. **Business** (after M5): requests list → confirm; calendar drag → proposal (app client) or move (phone client); manual booking.

## Report

A short table: flow · result (ok / bug) · what happened · screenshot or console line. Fix obvious bugs found in the same
session if the user asked for fixes; otherwise list them and ask.
