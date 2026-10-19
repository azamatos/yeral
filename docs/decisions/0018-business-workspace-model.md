# 0018. Business workspace model: our own teams, roles and client records; Better Auth for identity only

- Status: Accepted 2026-10-14; identity (Better Auth) revised by [0019](0019-own-phone-login-and-sessions.md) (own phone login and sessions); roles, memberships and invitations superseded by [0025](0025-fixed-levels-team-rows-invites.md) (three fixed levels, one staff row per person per workspace, invites with accept or decline)
- Decided by: the business design spec (`docs/design/business/README.md`, round 4, 14.10.2026) + Claude (model, auth split)

## Context

The business workspace design arrived (round 4: calendar, requests, bookings, clients, setup wizard, settings,
services, team and roles; appointment type only). Its data model (spec §10) adds memberships, editable roles with nine
permission switches, staff with their own shifts, breaks and days off, a per-business client list (CRM) with notes and
complaints, booking rules, branches and verification. ADR 0005 planned Better Auth's organization plugin for
"salons with member roles and invitations", and the schema doesn't exist yet (M2), so the model can be right first time.

What the design needs and the organization plugin doesn't give:

- A **phone-only specialist** ("Programmasyz") is on the team, bookable online, but never logs in, so it can't be a member.
- **Invitations go by SMS** to a phone number and turn active on that person's first login; the plugin invites by e-mail.
- **Roles are per-business templates** (Eýesi locked; Administrator, Hünärmen editable) with a visibility (own / whole
  calendar) and nine switches; a specialist who sees only their own bookings gets other people's as "Bes" (busy)
  with no details, and revenue is hidden without its switch. That is field-level redaction inside our services anyway.

## Decision

**Identity vs business access.** Better Auth owns identity only: users (phone, name, language), the phone + one-time
code login and sessions. Everything about businesses is ours, in Drizzle tables next to the rest of the schema:

| Table | Holds | Notes |
|---|---|---|
| `businesses` | one row per place; **a branch is its own business** (own slug, address, hours, team, clients) | the business switcher lists the user's memberships; "Şahamçalar" lists the businesses the user owns. No brand/organisation level until a design needs one |
| `staff` | everyone on the team: name shown to clients, specialization, phone, avatar, `bookable`, `hasApp`, order, services, schedule, breaks, personal days off, status `active · invited · disabled` | the client site's "specialist" is a bookable, active staff row. Owner and admin are staff rows too (`bookable: false`) |
| `memberships` | `userId ↔ businessId`, `roleId`, `staffId`, status | created when an invited phone first logs in. A phone-only staff row has no membership ("Programmasyz" is shown, not stored as a role) |
| `roles` | per business: name, `system`, `visibility: own · all`, `permissions[]` | created from three templates with each business: Eýesi (system, all, locked), Administrator, Hünärmen |
| `booking_rules` | one row per business (spec §8 "Ýazylyş düzgünleri") | see ADR 0017 revision for the fields |
| `clients` | the business's client list: unique `(businessId, phone)`, name, birthday, source, tags, `noRemindersSms`, `onlineBlocked`, `userId` when the phone belongs to a Ýeral user | an online booking finds or creates the client row by the user's verified phone. Visits, average bill, last visit and no-shows are computed from bookings, not stored |
| `client_notes` | text, `alert` ("Ýazylanda görkez": shown on booking blocks and drawers), author, time | team-only |
| `businesses.verification` (+ `verification_history`) | `pending · verified · rejected`, reason | only verified businesses are public: search, category pages, sitemap, business page. Members see their own page with a "Barlagda" banner. The workspace works from the first minute |

**Permissions** are the nine keys of spec §1, in code: visibility `own | all` plus `confirm`, `move`, `noshow`, `clients`,
`services`, `invite`, `revenue`, `settings`. The owner role has all of them and can't be edited or removed. A person's
permissions are their role's (the role is the ceiling; no per-person overrides are designed). Checks live in
`@yeral/domain/permissions` (pure: `can(role, action, booking?)`) and are enforced by the api, which also **redacts**:
with visibility `own`, other staff's bookings come back as `{ id, staffId, start, end, busy: true }`; without `revenue`,
money totals are omitted. The UI hides what the role can't see (design CLAUDE.md), but never relies on hiding.

**Requests for a phone-only specialist** go to everyone with `confirm` and visibility `all` (owner and admin by default).

**Deleting a client** keeps their bookings for reports with the client link removed and the name blanked
("Ýazylyş taryhy hasabatlarda atsyz galar").

## Consequences

- ADR 0005's "organization plugin = salon with member roles and invitations" no longer applies; Better Auth's phone-number
  plugin and sessions do. `systemPatterns.md` (Auth) and `techContext.md` say so.
- The M2 schema includes these tables from the start, though the business endpoints arrive with M5: no second migration
  of bookings and staff when the workspace is built.
- Every business-side endpoint takes the membership from the session and passes it to the service; tests cover
  "own visibility sees Bes" and "no revenue permission sees no totals".
- Branch-wide views (one client list or calendar across branches) are not designed; if they come, a grouping level is added then.

## Alternatives considered

- **Better Auth organization plugin (with dynamic access control) as the team model**: covers members, roles and
  invitations, but members must be users (phone-only staff aren't), invitations are e-mail based, and we would still
  need our own staff table and redaction, so two models would describe one team.
- **One `members` table merging staff and membership**: fewer joins, but a staff row exists without a login and a login
  can belong to several businesses; the design's own model (spec §10) keeps them apart, and so do we.
- **Clients as Ýeral users only**: a business adds phone and walk-in clients who have no account; the CRM has to own them.
