# The business app's shell (feat/p4-business-shell)

- Changed: P4 slice 1 (Accounts), PR 2b on the `@yeral/ui` shell components (PR 2a, #113). Book B-10, B-12 step 1,
  B-08 for someone signed in; design §27.1, §28.1, B-Shell, B-Mobile.
- `widgets/workspace-shell` (used by the `/w/$slug` route only, which Steiger allows from the app layer):
  - `WorkspaceShell` (the route's component): the 248 sidebar from 1024, the 72 rail from 768, the tab bar with More
    under 768, by CSS width alone (both sidebars render, one shows); the page clears the fixed tab bar. The workspace
    on screen becomes the last used (`team.open` when it isn't `current`), so the next sign-in opens it. `me` null (the
    session ended) or the workspace gone from the person's list → `/login`, which knows where they belong. Toast
    offsets for the shell (`--toast-left/bottom`: 272, 96, phones 12 and above the tab bar).
  - `ShellSidebar` (full, `collapsed` rail), `ShellTabBar` (+ MoreSheet: the switcher's row, the sections in More,
    the person, Open as a client, Log out; closes on any page change), `ShellSwitcher` (rows "level · city", the count of
    requests they may answer; picking one opens the same section there; "Create a business" → `/setup/business`),
    `WorkspacePage` (AppTopBar, the notes, the content padded 32/24/16; tab title "Calendar · Glow Studio · Ýeral
    Business"; `switcherOnPhone` for the calendar), `InviteNote`.
  - `model/sections.ts` (`sectionsFor(level)`, `canOpen`, `sectionOf`, `sameSectionIn`), `useWorkspace`, `useAccount`,
    `sectionClosed()` (the toast, once, by id).
- Routes: `/w/$slug` beforeLoad: signed in, else `/login`; not one of their workspaces → the last used one (else the
  first) at the same section + "This section is closed to you" (never on a hover preload); none at all → `/login`.
  `/w/$slug/{calendar,bookings,clients,reviews,settings}` render `pages/section` (stand-ins until their slices);
  `settings` refuses a Specialist the same way. `pages/calendar` (the old stand-in) is gone.
- `shared/i18n/translate.ts`: `translator()` for words outside components (the route's toast). `PageStory` takes
  `layouts` (a layout route with pages inside).
- How (for the book): the shell switches at 1024 and 768 as the design's README draws it; a pending invite for someone
  signed in shows as a note at the top of the page (the banners' place and shape, accent) whose Open leads to the
  sign-in's invite card; the More tab reads as current on a section that lives in More; switching keeps only the
  section (not a client's card); the account menu is Open as a client · Log out (My profile comes with the profile,
  Your Ýeral page and Contact Ýeral wait, see below).
- Gaps for the backend: no unanswered-reviews count (`workspaceSchema` has only `requestsToAnswer`), so Reviews shows
  none; no business status (in review, not approved, hidden) on the workspace for the banners.
- Not built: Your Ýeral page (the brief's three items; the business's public page waits for its verification state),
  Contact Ýeral (its phone and Telegram are open), the business status and notification banners, the demo sidebar.
- Checked: stories `Business/Shell/Workspace` (owner, switch, create, account menu + log out, specialist, 1024, rail,
  phone, More, invite note, long names); in the browser against the local api at 1440, 1024, 768 and 500: signed in
  as Maýsa, switched Glow Studio → Glow Studio · Parahat from More at Clients (same section, sheet closes, last used
  saved), a foreign workspace's address → the last used with the toast above the tab bar, logged out from More; as
  Aýna (Specialist) Settings by address → the calendar with the toast.
