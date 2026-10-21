# Releases paused until the MVP works (chore/remove-releases)

- Changed: ADR 0009 amended (releases paused), ADR 0010 and 0020 noted; `operations.md` (CI table, Versioning,
  "Deploys and labels" replaces "How the release flow behaves"), `techContext.md`, `systemPatterns.md`, AGENTS.md rule 11
  and the commands table, CLAUDE.md's skills table, README "Shipping"; book chapters 6 (F-206), 9 (Technology) and 10
  (P2 step 7).
- The owner, 2026-10-21: "Lets remove release logic for now. We are under development. There is no even working MVP
  version."
- Removed: `.github/workflows/release.yml`, `.changeset/` (config, README and the pending changesets),
  the root scripts `changeset`, `version-packages`, `tag-release`, the Changesets packages and their
  catalog entries, the changeset lines in the PR and issue templates and in the skills. The skill `release` is now
  `ship` (checks, PR, review, merge, a deploy by hand, rollback). Version PR #130 is closed after this merges, with its
  `changeset-release/main` branch.
- Kept: Conventional Commits, squash merges on green CI, the versions and `CHANGELOG.md` files as they are, the tags,
  `deploy.yml` (Storybook from `ci.yml`, legacy by hand), the build stamp.
- For the lead to fold in, in `activeContext.md`: line 28 ("migrations 0004–0025 run with the next release (the
  version PR #38 collects the changesets)"), line 180 ("PR #38 is the version PR: the owner decides when to release")
  and line 203 ("decide when to release (#38, migrations 0004–0025)"); migrations now reach the server with a deploy
  by hand. `progress.md` mentions the release tags of M0–M2 (history, keep).
- Open PRs that add `.changeset/*.md` must drop them: CI's checks now fail while a `.changeset/` folder exists
  (ci.yml, "No changesets while releases are paused").
- `deploy.yml` deploys only from `main` now (a run started by hand on another branch skips); the `production`
  environment has no protection rules of its own.
- Not tagged: the versions #85 (c2ed139) wrote (`@yeral/api@0.3.0`, `ui@0.4.0`, `contract`/`domain`/`sdk`/`i18n@0.3.0`,
  `storybook@0.1.4`, `business@0.1.0`, `config@0.1.0`, `features@0.0.1`): its Release run never started (the Actions
  billing stop). When releases come back: tag them at c2ed139 or start fresh (ADR 0009).

## Unreleased: the deleted changesets, for the first changelog

- **@yeral/client** (minor), **@yeral/ui** (patch), the client site (#110): `apps/client`, TanStack Start with
  server-rendered public pages and browser-only account and login pages, TanStack Query through `@yeral/sdk`, the
  design system's Tailwind theme, use-intl with English as the source and FSD layers. Every address starts with its
  language (`/en/…`); `/` opens the signed-in person's language, else the browser's when the site has it, else the
  market's main one (Q-132). Title, description, canonical and hreflang per page; the header (logo, For business, Log in
  or the avatar menu) and the footer from the boards; Home a stand-in until slice 5; the 404 page with HTTP 404; served
  at http://yeral.localhost by the local stack from `infra/docker/client.Dockerfile`. `@yeral/ui`: `LanguageSwitcher`
  renders nothing with one language; `cn()` knows the layout widths.
- **@yeral/client** (minor), **@yeral/ui** (patch), log in on the client site (#114, C-19): «Log in» opens a 400 modal
  (a bottom sheet on phones) with the phone and the code (on the screen at the first launch), "Is this you?" for an
  account unused for 6 months, and the name for a new account; `/{lang}/login` opens it too and goes back to
  `?redirect=`. `ModalHeader` takes `media`; `textLink` moves into `@yeral/ui`.
- **@yeral/business** (minor), the workspace shell (#119): the sidebar (from 1024), the icon rail (from 768) or the tab
  bar with More (phones), the workspace switcher, the account menu, the requests count, a note when an invite waits,
  "This section is closed to you" for a section or workspace that isn't the person's; Calendar, Bookings, Clients,
  Reviews and Settings are stand-ins.
- **@yeral/ui** (minor), the shell pieces (#113): WorkspaceSwitcher, AccountMenu, BottomTabBar, MoreSheet, AppTopBar;
  SideNav's rail; Avatar sizes 24/28/36/64, square logo, letter tile, AddAvatar; CountBadge muted, dot and 99+;
  Tooltip's ink style.
- **@yeral/domain** (minor), **@yeral/features** (minor), **@yeral/business** (patch), the mobile prefixes (#111):
  `MARKET.phone.mobilePrefixes` (Turkmenistan `['6', '7']`) is the one source; `MARKET.phone.mobile` is built from it,
  so the api's `isMobile` checks the list the screens name.
- **@yeral/api** (minor), **@yeral/contract** (minor), **@yeral/domain** (minor), **@yeral/i18n** (minor),
  **@yeral/sdk** (minor), setting a business up (#112; book B-02–B-06, Q-200): the business step starts a draft with its
  own page address; the wizard saves its step and reopens there at sign-in; the steps fill it in through the settings;
  finishing (with an address, an open day and a service) puts it in the switcher and in Ýeral's review. Migration 0031
  adds `businesses.setup_step`.
- **@yeral/api** (minor), **@yeral/contract** (minor), **@yeral/domain** (minor), **@yeral/i18n** (minor),
  **@yeral/sdk** (minor), photos (#116; book F-084, F-101, B-12, B-37): a business's gallery (up to 20, added, removed
  and ordered, the first the cover), a person's own photo and a team member's picture, each JPEG, PNG or WebP up to 10
  MB by its bytes, kept without its EXIF (GPS), XMP and comments on the server's disk behind a storage port and served
  at `/media/up/…`. Uploads need a sign-in, 60 an hour per account; the team's screens show a person's own photo where
  the owner set none. Migration 0032 adds `users.photo`; the api's image takes a `media` volume (`MEDIA_DIR`).
- **@yeral/api** (minor), **@yeral/contract** (minor), **@yeral/domain** (minor), the timed notices (#117; book S-01,
  S-13): each request says when "Haýyşyň wagty gutarýar" is due (`warnAt`, 5 minutes of open time before its answer time
  ends), and when an invite's 7 days run out the team's and the invitee's screens refresh once. Migration 0033 adds
  `invites.expiry_told_at`.
- **@yeral/api** (minor), **@yeral/contract** (minor), the business profile has "Floor, room" (#120; book F-099, up to
  40 characters) beside the address, shown on the page and on a booking as the exact address is. Migration 0034 adds
  `businesses.floor`.
- **@yeral/api** (minor), **@yeral/contract** (minor), **@yeral/i18n** (minor), the Ýeral team's sign-in for the admin
  tool (#122; book F-178, ADR 0026): its own accounts with a login, a password and an authenticator code (or a recovery
  code), set up from a link the server command (`admin-invite`) or a teammate makes, reset and turned off by one
  another; sessions of their own on `/v1/admin`. Migration 0035 adds `admins`, `admin_sessions` and `admin_actions`; the
  server needs `ADMIN_SECRET_KEY` (deploy.sh makes it).
- **@yeral/api** (minor), **@yeral/contract** (minor), **@yeral/domain** (minor), **@yeral/i18n** (minor),
  **@yeral/sdk** (minor), the admin tool's businesses (#123; book F-179, S-17): the queue to review, a business to
  check, verified or sent back with a reason (a live one un-verified), hidden from visitors with a reason and shown
  again, a move checked again; the owner sends a business back for review once fixed, and hears every result on screen
  and by an SMS that never goes at night. Migration 0036 adds `businesses.sent_for_review_at`, `hidden_at` and
  `hidden_reason`.
- Not written as changesets (they came after): the client profile (#118), the business login's invites (#115), My
  account (#121).

- Repository setting *Allow GitHub Actions to create and approve pull requests* is unused now; switching it off is the
  owner's call.
