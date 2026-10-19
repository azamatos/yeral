# 0025. Three fixed access levels; a team member is one staff row; invites wait for an answer

- Status: Accepted 2026-10-19 — supersedes the roles, memberships and invitation parts of
  [0018](0018-business-workspace-model.md)
- Decided by: the business design (round 6: three fixed levels, accept or decline, 7 days) and the product book
  (chapter 3; F-088 MVP, F-089 matrix editing Later, F-218 custom roles Never; Q-216 specialist without the app) +
  Claude (the table model; the open points below, delegated)

## Context

ADR 0018 (round 4) gave each business editable roles: a `roles` table with a visibility (own or all) and eight on/off
switches, and a `memberships` table that joined an account to a business through a role and turned an invitation
active at the person's first sign-in. Round 6 and the product book replaced that: three fixed levels (*Eýesi*,
*Administrator*, *Hünärmen*), a fixed permission table for the MVP (the owner editing it is Later, F-089), the "who
answers requests" setting with a per-person override, invites the person accepts or declines within 7 days, a
specialist without the app as an option of *Hünärmen*, and *Başga ýerde*, which needs each account linked to its rows
on every team (book chapter 3, 07b, 07c S-13, S-14). The backend plan's step 2 builds this (chapter 10).

## Decision

- **Levels, not roles.** `@yeral/domain/permissions` holds the three levels and one fixed table of 11 rows (calendar,
  answer requests, bookings, no-shows, clients, review replies, revenue, analytics, services, settings, team), each
  `none · own · all` (the team row `none · view · manage`). "Own" = the person's own column, bookings, clients and
  earnings. `canAnswerRequest()` applies the business's `requestAnswerers` (`desk · each · both`, default `both`),
  the owner always, requests for a specialist without the app to the owner and administrators, and the override
  `canAnswerOwn` (it only takes the right away).
- **One row per person per workspace.** The `staff` row is both who they are to clients and their access: `userId`
  (the account), `level`, `canAnswerOwn`, `status` (`active · invited · removed`), `hasApp`, `lastOpenedAt` (the
  business app opens the most recent workspace). Someone signs in to a workspace when their row is active, has the app
  and is linked to their account. The `roles` and `memberships` tables are gone (migrations 0005, 0006 move their
  data). The database keeps the invariants: one active owner per workspace, one row per account per workspace, a phone
  for a specialist without the app, the owner always with the app.
- **Invites** are their own table: phone, the staff row waiting for them, who sent it, a hashed link token, the answer
  (`pending · accepted · declined · cancelled`), sent and expiry times. A pending invite past its 7 days reads as
  expired, with no job. Signing in no longer joins a team: the person accepts or declines. One open invite per phone
  per workspace.
- **Settled while building (Claude, delegated, 2026-10-19):** only the owner invites (chapter 5 said "owner/admin";
  chapters 3 and 7b say owner); the override only takes the right away; the owner can't leave and there is no
  hand-over in the MVP (F-092 is Later); after a decline, cancel or expiry the invited row stays, not bookable, until
  the owner resends or removes it, and a specialist without the app who declines stays without the app; a removed
  member loses access, and reactivating restores it; the account link stays on the row after leaving, so their kept
  bookings still block them elsewhere; "own clients" are clients with a booking where the person is the specialist;
  an owner can't delete their account while they own a workspace (`owns_workspace`); the copied invite link only opens
  the invite, which still has to match the signed-in phone; several invites are listed oldest first and answered one
  by one; inviting a phone that is already on the team or has an open invite is refused; an expired invite shows until
  the owner resends or cancels it.

## Consequences

- Easier: one row answers "who is this person here" for the calendar, the client site, access and *Başga ýerde*;
  no role editor to build or test; the permission table is one constant with tests.
- Harder: when the owner may edit the table (F-089), the per-level values move into a per-business table; the domain
  functions keep their shape.
- Built in two steps: this model and its migrations, then the switcher, invites and team endpoints (book chapter 10,
  P2 step 2).

## Alternatives considered

- **Keep memberships beside staff:** two rows per person per workspace that must agree on status and phone; every
  query joins them.
- **Keep editable roles with three templates:** F-218 (custom roles) is Never, and a fixed table is what the MVP draws.
