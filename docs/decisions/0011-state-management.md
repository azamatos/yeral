# 0011. State management: each kind of state has one owner

- Status: Accepted 2026-10-13; amended 2026-10-25 (forms: plain state, no TanStack Form)
- Decided by: owner (asked for one clear answer) + Claude

## Context

Most of what an app like Yeral calls "state" is a local copy of server data (salons, slots, bookings, the session).
Putting that into a global client store duplicates the server and goes stale. The rest is small and of different kinds:
what's in the URL, what's being typed in a form, what's open on screen. The business calendar adds real client-side
interaction state (drag in progress, zoom, selection). Several agents will write code in parallel, so the rule has to
be mechanical.

## Decision

| Kind of state | Owner | Yeral examples |
|---|---|---|
| Server data | **TanStack Query** through `@yeral/sdk` | salons, availability, bookings, reviews, the session (`me`) |
| Anything a link should reproduce | **TanStack Router search params**, validated by zod | search filters, booking wizard (`?svc=&staff=&date=&time=&step=`), calendar `date/view/staff`, the open drawer's booking id |
| A form being filled in | a **form hook in the owning slice** (amended 2026-10-25): `useState` for the values, started from the query, rules as plain functions in `model/` with unit tests, the save mutation sending only what changed | profile, service editor, booking rules, phone + code |
| One component or a small subtree | `useState` / `useReducer` (lift up; Context only for compound components) | popover open, hovered slot |
| Client-only state shared by distant components | **Zustand** store in the owning slice's `model/` | calendar zoom, drag in progress, multi-select, command palette |
| Preferences that survive reload on this device | Zustand `persist` over safe storage | list/map toggle, last district, calendar density |
| Preferences that must follow the user across devices | server (user settings via the API) | notification settings, language |
| Changes made elsewhere | events feed → `queryClient.invalidateQueries` | the salon confirmed → the client's screen refreshes |

Decision tree, in order: comes from the server? → Query. Should a shared link restore it? → URL. Is it unsaved form
input? → the slice's form hook. Used by one subtree? → `useState`. Otherwise → a Zustand store in the slice that owns it.

Rules:

- Never copy server data into a store or `useState` "to edit it": edit it in a form initialised from the query, then mutate.
- Session is a query (`sdk.auth.me`); login/logout mutations set or clear it. No auth store.
- Optimistic updates live in mutation options (`onMutate` + rollback), only where instant feedback matters (favourite, calendar drag).
- Context carries dependencies (QueryClient, sdk instance, i18n), not changing state.
- A Zustand store is small, owned by one slice, exported through the slice's `index.ts`, and has selectors for every read.
- If a flow grows real states and transitions (calendar drag/resize with conflicts), model it as an explicit reducer or
  state machine inside that slice first; adopt XState only if that isn't enough.

## Why these tools

- **TanStack Query**: caching, de-duplication, background refresh, invalidation by key, optimistic updates, SSR
  hydration through the router. The thing a global store would otherwise re-implement badly.
- **Router search params**: shareable, back-button friendly, visible to SSR, survives reload; TanStack Router types and
  validates them with zod.
- ~~**TanStack Form**~~ (dropped 2026-10-25, see the amendment): chosen at first over React Hook Form for React
  Compiler and typed nested fields, never installed.
- **Zustand**: tiny, no provider, selector-based (re-renders only readers), usable outside React (events poller, keyboard
  shortcuts), easy to find (one file in `model/`).

## Alternatives considered

- **Redux Toolkit (+ RTK Query)**: duplicates TanStack Query, more ceremony, and a global store invites putting server data in it.
- **Jotai**: excellent for fine-grained derived state, but atoms spread across files and are harder for several agents to keep track of.
- **MobX / Valtio**: implicit reactivity through proxies; harder to trace and at odds with React Compiler's assumptions.
- **React Context as a store**: re-renders every consumer on each change; fine for dependencies only.
- **React Hook Form**: more examples online, but friction with React Compiler and weaker typing of nested fields.
- **TanStack Form** (the first choice, dropped 2026-10-25): typed nested fields and zod validators, but a layer the forms
  didn't need; none of the apps' forms used it.

## Amendment 2026-10-25: forms are plain state

The owner, 2026-10-25: "Go with recommendation. The main idea is not overcomplicating things." By then every form in
both apps (the logins, the setup wizard's steps, the Settings sections, My account) was a hook in its slice holding
`useState`, started from the query, with its rules as tested functions in `model/` (`useRulesForm`, `useHoursStep`, the
profile form), and TanStack Form was never installed. The decision now says what the code does: a form is the owning
slice's hook (values in `useState`, rules in `model/`, a mutation that sends what changed, Discard back to the query's
data). A library comes in only when a form outgrows that (many dynamic nested fields), through a new amendment.
