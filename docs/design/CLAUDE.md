# Ýeral web — design rules for Claude Code

This folder (`docs/design/`) is the complete design hand-off for **yeral.app**, the client marketplace. It was produced on the "Ýeral Web" design canvas (claude.ai artifact `Hkq5oyUnRVrRV3XSs7EAtt`, pages *Design system*, *Client site*, *Client site · reference*). Treat it as the source of truth for every UI decision. Prompts in a later session may lack context — this file and `README.md` carry it.

## Read in this order
1. `README.md` — product spec: what Ýeral is, booking types, routes, behaviour of every screen, booking lifecycle, data model, i18n, geo, Turkmen glossary, decisions log.
2. `tokens.css` — every colour, size, radius, shadow as CSS variables. Use these names; do not hard-code new values.
3. `screens/README.md` — index of the hi-fi screens, which route each one is, which states/tweaks it has, developer notes per screen.
4. The `.dc.html` screen for the page you are building (in `screens/client/`), plus `screens/system/DS-Components.dc.html` for component states.
5. `demo-data.json` — seed/fixture data used by every screen (businesses, services, people, bookings, demo clock).

## Non-negotiable product rules
- **Ýeral = "ýer al" (take a place).** Bookings for any business that sells time — not only beauty. Four booking types: appointment, table, class, resource (later). The category decides the type.
- **The business confirms every booking by hand.** The client's first state is always *Garaşylýar* (Pending) and copy says the request was *sent* ("Ýazylyş ugradyldy"), never "booked".
- **Five statuses with one meaning everywhere:** Garaşylýar / Tassyklandy / Tamamlandy / Ýatyryldy / Gelmedi, with the exact badge colours in `tokens.css`. A visit becomes Completed by default after it ends. Phone bookings are Confirmed + phone icon. Cancelled-by-client vs by-business = same colour, different icon + label.
- **No city in UI copy.** Location = the user's position ("Ýakynymda", "golaýyňyzda"). An IP city may appear only inside the "Nirede?" field when geolocation is denied.
- **Turkmen is the default language** (`/tk/…`), then RU, EN. Copy in the screens is final TK draft — copy it verbatim into the TK message catalogue (it still needs a native review). RU strings run ~30% longer: never fixed-width buttons.
- **No online payment yet.** "Töleg ýerinde" (pay at the place). Keep a hidden deposit row in summaries for later.

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

If the repo has no stack yet, a good fit (not decided by design): Next.js App Router + TypeScript, CSS variables from `tokens.css` (CSS Modules), `next-intl` for TK/RU/EN with `/tk|/ru|/en` prefixes, MapLibre GL for maps, `lucide-react` icons. Ask before choosing if unsure.

## When something isn't drawn
Follow the nearest drawn pattern; never invent a new visual language. Mapping:
- Category landing `/tk/c/{category}` → `Search` with the category pre-selected and an H1.
- Photo gallery → full-screen ink overlay, arrows, counter, close (pattern in README §3).
- Static pages (about, help, privacy, terms) → marketing header + one 720-wide text column + footer.
- Location help sheet ("Sazlamalary aç") → 400 modal like Login.
- Filters drawer ("Süzgüçler") → right drawer 480 like the booking detail drawer.
- Business pages for table/class types → `Venue` layout with the aside swapped for the table widget or "Indiki sapaklar" (README §4.3).

## Ask the user instead of guessing
Manat prices for business plans/commission · real average bills · official store badges · map provider · SMS provider · anything that changes a product rule above.

## Assets
- `assets/photos/` — Unsplash photos (free licence, credits in `CREDITS.md`). Fine for demo seeds and marketing placeholders; real businesses upload their own photos.
- `assets/brand/` — Ýeral icon, mark and lockups (ink/white). The `salon-*.jpg` files there are leftovers from the mobile prototype with unclear origin (one came from a Fresha listing) — do not ship them.
