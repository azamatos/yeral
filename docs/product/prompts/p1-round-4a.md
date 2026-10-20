# P1 · Round 4a — the client site, part 1 (small iterations)

Written by Claude Code on 20.10.2026. Round 4a redraws the client site's finding side in English, one board per
prompt (chapter 10, P1): 4a.1 Home, 4a.2 Search and Client-Map, 4a.3 Venue, 4a.4 States. Each prompt is written after
the previous one is checked.

## Prompt 4a.1 — Home

**Not pasted.** The design pass stopped after round 3.4 (owner, 20.10.2026; ADR 0021 amended): what this prompt
fixes is in the book and gets built from it. Kept for the record.

```
Round 4a.1 of the design pass (export v0.6): the client site's Home in English. A small iteration: Home, its phone
frames on Mobile (frame 1 and the search sheet) and a canvas tidy. Don't touch the other client boards; they come in
the next iterations. The round-1 words and components hold (ExampleBadge, LanguageSwitcher hidden for one language,
" · " between date and time). Tokens and visual style don't change.

1. Canvas tidy: move Booking-Table, Booking-Class and the three Home explorations (Home-A, Home-B, Home-C) to the
   "Later · not MVP" page, unchanged. Ýeral launches with appointments only; tables and classes come later.
2. Home in English, otherwise as drawn. Hero: the kicker "Online booking for any service", the title "Take your
   place." (the name: "ýer al" is Turkmen for "take a place") and a line without tables or classes, such as "A
   barber's chair, a dentist's appointment or a lesson: see the free times and book in a minute." The search card
   What? / Where? (Near me) / When? + "Show free times". The photo mosaic shows appointment categories only (no
   Restaurant).
3. Header: logo · For business · Log in; signed in, the avatar menu My bookings · Favourites · Profile · Log out. No
   language menu while the market has one language (the first release: English); a tweak `languages: 3` shows the
   switcher for later markets.
4. "Free today near you": 4 cards, nearest first, each with its next 3 free times; a time opens booking with that
   time chosen. Barber Loft, Rahat Spa and Ak Diş stay; Nail Bar Aýna replaces Bag kafe. A tweak `examples` (on at
   the first release): each card carries the ExampleBadge (M on cards); off, no badge.
5. A tweak `location`: known (as drawn, "Based on your location · change"); unknown (the banner "Let us show places
   near you" with "Show my location" and "I'll type an address", above "Popular places · by rating and number of
   reviews", no distances); denied (Where? shows the market's main city with "Location off — showing by city"; cards
   show category and street instead of a distance). The city picker itself is drawn with Search, in the next
   iteration. A tweak `freeToday: none`: no place nearby has a free time today, from the search empty-state pattern
   (States tile 01).
6. Categories: the launch categories that take appointments, with these names and one example line each: Beauty ·
   Barbershop · Nails · Spa & massage · Dentist · Health · Fitness · Lessons · Auto · Pets · Home services (11 tiles;
   Restaurant and Café & tea house come later). A tile opens its category page (/en/c/{category}).
7. How it works: Search · Pick a time · Get confirmed, with no tables or classes and no SMS promise: step 3 says the
   business confirms and the client sees it in My bookings, where they can change or cancel it.
8. The Ýeral Business block, in B-Landing's words: free for everyone (drop "Free for solo specialists" and the
   Prices link), no restaurants, reports or SMS in the copy; buttons "Add your business" and "Try the business app"
   (the shared demo workspace, without signing in). Remove the app download block ("Ýeral on your phone"): native
   apps come later.
9. Footer: For clients (Search · Categories · My bookings) · For business (Ýeral Business · Log in) · Ýeral (About ·
   Help · Contact Ýeral; the help centre comes later) · © 2026 Ýeral · Privacy policy · Terms of use. No Prices
   link, no Language column while the market has one language, no city name anywhere in the copy.
10. Mobile: frame 1 (Home) and the full-screen search sheet (What, then Where, then When) with the same changes,
    including the location-unknown banner. Check the hero, cards, tiles, the business block and the footer with
    Russian-length text (about 30% longer) and note what wraps.

When done, add a short "v0.6 · round 4a.1" entry to the CHANGELOG, with "Decided while drawing" for anything this
prompt doesn't settle.
```

## What to check on the canvas afterwards (Claude Code)

- 4a.1: Booking-Table, Booking-Class and Home-A/B/C on the Later page; Home in English with no tables, classes,
  restaurants, SMS promises, Prices link, app block or language menu; the Example badge tweak; the three location
  states and the no-free-times state; the 11 tiles; both business buttons; Mobile frame 1 and the search sheet; the
  Russian-length note.
