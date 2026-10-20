# Ýeral web — design rules for Claude Code

This folder (`docs/design/`) is the complete design hand-off for **yeral.app** (client marketplace) and **business.yeral.app** (business workspace + B2B landing). It was produced on the "Ýeral Web" design canvas (claude.ai artifact `Hkq5oyUnRVrRV3XSs7EAtt`, pages *Design system*, *Client site*, *Client site · reference*, *Business workspace*). Export **v0.6 round 3** (20.10.2026) — what changed since the last export is in `CHANGELOG.md`. Treat it as the source of truth for every UI decision. Prompts in a later session may lack context — this file and `README.md` carry it.

## Read in this order
1. `README.md` — product spec: what Ýeral is, booking types, routes, behaviour of every screen, booking lifecycle, data model, i18n, geo, Turkmen glossary, decisions log.
2. `tokens.css` (v0.5) — every colour, size, radius, shadow as CSS variables. Use these names; do not hard-code new values.
3. `screens/README.md` — index of the hi-fi screens, which route each one is, which states/tweaks it has, developer notes per screen.
4. `COMPONENTS.md` — the component map: every component the screens use, where it lives in code (`@yeral/ui` or an FSD slice), its Storybook status (exists / extend / new) and states. Boards: `screens/system/DS-Components.dc.html` (v0.3 base), `DS-Patterns.dc.html` (v0.6 domain-free), `DS-Business.dc.html` (v0.6 round 3 domain).
5. The `.dc.html` screen for the page you are building (`screens/client/` or `screens/business/`; `screens/later/` is not in the first release).
6. `demo-data.json` (client) and `business/demo-data.json` (business) — seed/fixture data used by every screen (businesses, services, people, bookings, demo clock).
7. `CHANGELOG.md` — what changed in this export and which repo docs/components it affects.
8. `ROUND6-ANSWERS.md` — item-by-item answers to the code's design request `docs/design-requests/2026-10-16-round-6.md` (decision · drawn where · to do in the repo).

## Non-negotiable product rules
- **Ýeral = "ýer al" (take a place).** Bookings for any business that sells time — not only beauty. Four booking types: appointment, table, class, resource (later). The category decides the type.
- **The business confirms bookings by hand by default.** The client's first state is *Garaşylýar* (Pending) and copy says the request was *sent* ("Ýazylyş ugradyldy"), never "booked". Businesses may switch on instant confirmation (then: *Tassyklandy* at once). Unanswered requests expire after the business's hold time (default 30 min).
- **Five statuses with one meaning everywhere:** Garaşylýar / Tassyklandy / Tamamlandy / Ýatyryldy / Gelmedi, with the exact badge colours in `tokens.css` and one icon each (clock · check · check-check · x · user-x — badges are icon + label, no dots). A visit becomes Completed by default after it ends. Phone bookings are Confirmed + phone icon. Cancelled-by-client vs by-business = same colour, different icon + label.
- **No city in UI copy.** Location = the user's position ("Ýakynymda", "golaýyňyzda"). An IP city may appear only inside the "Nirede?" field when geolocation is denied.
- **English first (v0.6, 19.10.2026).** Ýeral is built in English and isn't bound to one country; each market adds its own languages when Ýeral launches there (Turkmenistan: Turkmen and Russian; the switcher shows EN first and is hidden when a market has one language). The design-system boards are English from v0.6 round 1 and the **whole business app** from rounds 2–3; the client screens are still drawn in Turkmen until rounds 4a–4b — their Turkmen is the reference for the `tk` translation. **The first release has one language (English):** no language tabs, no main-language choice, no Language row, no language switcher on login pages. Copy rules: `copy/EN-GLOSSARY.md` and the Voice section on DS · Foundations. RU strings run ~30% longer: never fixed-width buttons.
- **No online payment yet.** "Töleg ýerinde" (pay at the place). Keep a hidden deposit row in summaries for later. **Ýeral itself is free for businesses on MVP** — no plans, commission or billing screens.

## Visual rules (must match the screens)
- White base, 1px `--n-200` dividers instead of boxed cards, ink `--n-900` text, one violet accent `--a-500` for selection, status and the primary action only.
- Font **Onest** (Google Fonts, weights 400–800, subsets latin, latin-ext, cyrillic, cyrillic-ext). Fallback system stack.
- **One gradient primary button per view** (`--primary-bg`). The round search button in the header query bar is ink. Secondary = white + 1px `--n-300`. Danger solid `#b42318` only for final destructive confirms.
- Selection: tint (`--a-50` bg, `--a-line` border, `--a-600` text) for chips, rows, tabs, cards; solid `--a-500` for the chosen date and time slot.
- Flat: shadows only on raised layers (popover, drawer, modal, toast). Modal 480/640 (login 400), right drawer 480, popover 280–360; all become bottom sheets under 768.
- Focus visible on everything: `--focus-ring`. Targets ≥ 44 px on touch. Text contrast ≥ 4.5:1 (never `--n-400` for text).
- Icons: Lucide (`lucide-react` or equivalent), stroke 1.75, sizes 16/20/24. The screens inline the same paths.
- Copy exact numbers from the screens (padding, gaps, radii, font sizes, line heights). Don't round to a framework scale.
- No emoji, no gradient backgrounds, no left-border accent cards, no new colours.

## How to read a `.dc.html` screen
They are design sources, not runnable pages (they need the canvas runtime `support.js`). Read them like a component:
- `<helmet><style>` = the shared CSS classes for that page (`.b .b-pri .b-sec .chip .slot .tab .badge .st-*` …). Port them into your component styles using `tokens.css` variables.
- Markup inside `<x-dc>` = the DOM. Inline `style="…"` values are exact.
- `{{name}}` = a value computed in `renderVals()` of the `class Component extends DCLogic` script at the bottom. `<sc-for list="{{items}}" as="it">` = map over a list. `<sc-if value="{{flag}}">` = conditional render. `onClick="{{fn}}"` = event handler from `renderVals()`; `this.state` / `this.setState` = local state.
- `data-props` on the script tag = canvas **tweaks**. They are preview switches for states (e.g. `step`, `loggedIn`, `view`, `empty`, `sent`) — in the real app these become route params, props or real state. The `font` tweak is only for comparing typefaces; ship Onest.
- Images point to `../../assets/photos/…` and `../../assets/brand/…` (copied next to this file).
- `@media (max-width:1023px)` and `(max-width:767px)` rules in the helmet are the responsive spec; `screens/client/Mobile.dc.html` shows phone layouts at 390.

## Building the client site
Suggested order: tokens + base components (from `DS-Components`) → layout shells (marketing header, search header, focused booking header, footer) → Home → Search (+ map) → Business page → Appointment booking (+ inline login) → Table + Class booking → Login modal → My bookings (drawer, cancel, review) → Profile + Favourites → States (empty, errors, location, 404) → phone layouts pass → RU/EN.

Definition of done for each page:
1. Matches the screen at 1440 and the phone frame at 390 (works 360–767, 768–1023, ≥1024).
2. Every state listed for it in `screens/README.md` is reachable through real data/routes.
3. TK copy verbatim; RU/EN keys exist.
4. Keyboard: tab order, visible focus, Esc closes overlays, focus returns to the trigger.
5. Statuses and actions follow the table in `README.md` §4.8.

**Stack:** the yeral/web repo has already decided its stack (pnpm + Turborepo, Vite + TanStack, Tailwind theme mapped 1:1 from `tokens.css`, use-intl, Feature-Sliced Design) — the repo's `AGENTS.md` and ADRs win over anything here. Only for a repo with no stack would this have been a fit (not decided by design): Next.js App Router + TypeScript, CSS variables from `tokens.css` (CSS Modules), `next-intl` for TK/RU/EN with `/tk|/ru|/en` prefixes, MapLibre GL for maps, `lucide-react` icons. Ask before choosing if unsure.

## When something isn't drawn
Follow the nearest drawn pattern; never invent a new visual language. Mapping:
- Category landing `/tk/c/{category}` → `Search` with the category pre-selected and an H1.
- Photo gallery → full-screen ink overlay, arrows, counter, close (pattern in README §3).
- Static pages (about, help, privacy, terms) → marketing header + one 720-wide text column + footer.
- Location help sheet ("Sazlamalary aç") → 400 modal like Login.
- Filters drawer ("Süzgüçler") → right drawer 480 like the booking detail drawer.
- Business pages for table/class types → `Venue` layout with the aside swapped for the table widget or "Indiki sapaklar" (README §4.3).

## Ask the user instead of guessing
Real average bills · official store badges · SMS provider · anything that changes a product rule above. (Closed: maps = MapLibre + OpenFreeMap; Turkmen copy is checked by the owner in code; RU/EN come from code.)

## Assets
- `assets/photos/` — Unsplash photos (free licence, credits in `CREDITS.md`). Fine for demo seeds and marketing placeholders; real businesses upload their own photos.
- `assets/brand/` — Ýeral icon, mark and lockups (ink/white). The `salon-*.jpg` files there are leftovers from the mobile prototype with unclear origin (one came from a Fresha listing) — do not ship them.

## Business workspace (business.yeral.app)
- Spec: `business/README.md` — **§28 (v0.6 round 3), then §27 (round 2), win** for the whole business app; **§25 (round 6)** for the rest where sections disagree (accounts & workspaces, access levels, request handling, statuses & legend, phones, free MVP). Demo data: `business/demo-data.json` (Glow Studio; `accounts`, `accessLevels`, `statusesV2`, round 2–3 facts in `v06r2` / `v06r3`; the Bag kafe / Aýdyň ýoga workspaces belong to the later boards).
- **Everything is free on MVP** — no billing, plans or commission anywhere (the old billing design is not exported).
- **First release = appointments only.** Addresses `business.yeral.app/w/{slug}/calendar|bookings|clients|reviews|settings/{section}`, `/login`, `/setup/{step}` (no language in the path). Sidebar Calendar · Bookings · Clients · Reviews · Settings; Contact Ýeral sits in the account menu; no global search in the top bar. **No SMS promises in copy** ("the client is notified"). Money: prices show with every booking; sums (revenue, client totals, average check) only with See revenue (owner).
- **One Ýeral login** (phone + code, same account as on yeral.app; at the first release the code is shown on screen — the SMS copy is the later variant). "Try the business app" opens one shared, signed-out demo workspace (nightly reset) → invite / empty / last used workspace. A **workspace** = one business at one address; a person can be in several, with a different access level in each. The **workspace switcher** (sidebar top) is the only switch; the bottom block is the person's menu.
- **Access levels**: Owner / Admin / Specialist, **fixed** (read-only permissions table, no editing, no ownership transfer, the owner can't leave); a Specialist has a **"Uses the app"** switch (off = bookable, never signs in — "Doesn't use the app"; phone required either way); only the owner invites and manages the team; anything a level can't access is hidden, not disabled.
- Screens: `screens/business/` — start with `B-Login` and `B-Shell` (sidebar, switcher, account menu, banners, access-level sidebars, permissions, My profile, someone leaves), `B-Mobile` (phone layouts), then `B-Calendar` (the core screen; tweaks `panel`, `clock`, `banner`, `role`, `answers`, `legend`, `internal`), `B-Bookings`, `B-Onboarding`, `B-Clients`, `B-Client`, `B-Settings`, `B-Services`, `B-Team`, `B-Reviews`, `B-Landing` (all English). `screens/later/` (B-Analytics, B-Help, B-Tables, B-Classes, B-Billing, B-Notifications) is **not** in the first release — never draw "coming soon" for it.
- Same design system and tokens as the client site, denser: 14/20 in tables and panels, rows 52–56, S buttons in toolbars.
- Works on every width: ≥1024 sidebar, 768–1023 icon rail, under 768 top strip + bottom tab bar (Calendar · Bookings · Clients · More) — no "use the app" banner.
- Build order: login + shell (switcher, access levels, banners) → calendar (day all staff → panels → block time → week → role views) → bookings list → setup wizard → clients → settings (profile, rules, hours, link and QR) → services → team & permissions → reviews → B2B landing. Later (not first release): analytics, help, tables, classes, notification settings.
- Not designed: checkout/POS (revenue = prices of completed visits), table/class-specific setup wizard, admin panel (cms.yeral.app). (Overnight opening hours are designed since round 2.)

## Design system in code — `@yeral/ui` + Storybook must grow with the screens
The repo already has the design system in code: **`@yeral/ui`** (`packages/ui`, 38 components built from DS v0.3.1 on Radix + cva + `cn()`) and **Storybook 10** (`apps/storybook`, storybook.yeral.app; stories are the tests: render, interaction, axe). This export carries DS **v0.6 round 3** (v0.5 + English + round-2/3 business patterns) — dozens of new components, variants, badges and patterns from the client and business screens. They are not in code yet. Rules:
1. **Before building any screen, open `COMPONENTS.md`** and find every piece of the screen there. `exists` → use it. `extend` → add the variant/prop and its stories first. `new` → build the component first, with stories for every state on its board, then the screen.
2. **Where it goes:** domain-free → `@yeral/ui` (`pnpm gen ui-component <name>`, no text inside, tokens only). Mentions bookings / businesses / staff / clients / money → the FSD slice named in `COMPONENTS.md` (`entities/*/ui`, `features/*/ui`, `widgets/*`) with its stories next to it. Follow the repo skills `design-system`, `fsd`, `testing`, `i18n`.
3. **The boards are canonical.** Several screens drew the same thing slightly differently; `DS-Patterns.dc.html` / `DS-Business.dc.html` hold the unified version and `COMPONENTS.md` lists the drift. Screens give layout and copy; components come from the boards.
4. **Tokens v0.5** add aliases only (no new colours): `--fs-small`, `--fs-micro`, `--r-xs`, `--r-sm`, `--modal-ml`, `--shadow-control`, `--switch-off-ring`, `--focus-ring-inset`, `--input-warning`, `--chart-*`, `--ring-selected`. Map them in `packages/ui/src/styles/theme.css`; `tokens.test.ts` will fail until you do — that's the signal.
5. **Every future design export works the same way:** new screens → new/extended components in `COMPONENTS.md` + a DS board → Storybook first, screens second. When the designer adds a component, the Storybook gets it; nothing ships as a one-off inside a page.
6. This folder is the owner's export and read-only for you: don't edit files in `docs/design/`; flag disagreements to the owner instead. `CHANGELOG.md` lists repo docs that need updating because of this export (ADR 0017, AGENTS.md, memory bank) — those are yours to update.
