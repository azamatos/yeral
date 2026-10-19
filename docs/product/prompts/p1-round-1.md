# P1 · Round 1 — design system in English

Written by Claude Code on 19.10.2026 for the owner to paste into Claude Design (canvas "Ýeral Web"). Source: the
product book (`docs/product`, closed 18.10.2026), chapter 2 (norms) and chapter 10 (plan). Rounds 2–6 follow
(chapter 10, P1).

## Prompt

```
Round 1 of the next design pass (export v0.6). Scope: ONLY the five design-system boards on the "Design system" page:
DS · Foundations, DS · Components, DS · Categories & booking types, DS · Product components, and DS · Business patterns
(text only on that last one, see 6). Don't touch the client or business screens yet; they follow in rounds 2–4.

Why: Ýeral is now built in English first and isn't bound to one country. Each country adds its own languages when
Ýeral launches there (Turkmenistan: Turkmen and Russian). The Turkmen you drew stays the reference for the Turkmen
translation later. Tokens, colours, type, spacing, radii and icons don't change.

1. English everywhere. Every visible word on these boards becomes English: headings, labels, buttons, sample data,
   captions, empty states, errors, toasts. Use these words exactly:
   - Statuses (icon + label, never a dot alone): Pending · Confirmed · Completed · Cancelled · No-show.
   - Who cancelled: You cancelled · The business cancelled · The business declined (never confirmed) · No answer in time.
   - Actions: Book · Send booking · Confirm · Decline · Move to another time · Change the time (title of the move flow) ·
     Cancel booking · Undo · Book again · Report · Call · Directions.
   - Things: booking, request, free time, service, specialist, any specialist, client, workspace, team, invite,
     permissions, internal status, busy elsewhere, hours, break, special days, day off, buffer, booking rules,
     instant confirmation, in review, calendar, pay at the place, free, near me, my bookings, favourites,
     upcoming · past, source: online · phone · walk-in.
   - Access levels: Owner · Admin · Specialist.
   - The business product is "Ýeral Business".
   Sample data stays Turkmenistan's market (manats, +993 phones, Ashgabat businesses and names) but written the English
   way: 1,410 TMT · from 250 TMT · rating 4.9 · 1.2 km, 850 m, 3 km · Thursday, 15 October · Today · Tomorrow ·
   45 min · 1 h 30 min · 2 h · 24-hour times 14:30 and ranges 14:30–15:30 · "3 hours ago". Never a city name in copy
   ("near me", "near you").

2. Copy rules (keep them visible on DS · Foundations as a short "Voice" block):
   - "Sent", never "booked", until the business confirms ("Booking sent"; at an instant business "Booking confirmed").
   - Errors say what to do next ("This time was just taken. Free times nearby:").
   - No blame: a client limited to phone bookings sees "You can book this business by phone" with Call.
   - Prices: fixed "80 TMT", "from 250 TMT", "Free", hidden "Price at the place". There is NO average bill anywhere:
     remove every "≈ 150 TMT" / average-bill pill or row.
   - No emoji, no new colours, one gradient main button per view, what a person can't use is hidden (not greyed).

3. Brand: keep the wordmark exactly "Ýeral", with the Ý, everywhere it appears (logo and copy). Only the domain and the
   SMS sender are written "Yeral". Business side: "Ýeral Business".

4. New components and variants (add them to DS · Product components, each with its states):
   a. "Example" badge: marks the sample businesses that let visitors try Ýeral. Neutral (never violet, never a status
      colour), small, with a Lucide icon; show it on a business card, a search row, the business page header and a map
      pin.
   b. One shared sign-in code step, used everywhere (login modal, booking flows, business login, SMS link page):
      4 boxes that auto-check on the 4th digit AND a visible "Confirm" button; "Wrong code. N tries left."; after 3
      wrong tries one lock message "Too many tries. Try again in 60 seconds." and, when the lock ends, "Send a new
      code" (the old code no longer works); resend after 0:59; too many requests: "Too many codes. Try again in
      N minutes."
   c. A first-launch variant of that step: no SMS is sent, so the code is shown on the screen in a quiet callout
      ("Your code: 4821") above the boxes.
   d. Language switcher: hidden when the market has one language; with several, English first then the market's
      (EN · TK · RU).
   e. Long-text check: a small block showing the buttons, tabs, chips, badges, nav items and toasts with Russian-length
      text (about 30% longer than English) so nothing is cut: buttons grow and never have a fixed width; labels wrap to
      two lines before being cut.

5. DS · Categories & booking types: English names and hints. Appointments ship first; tables and classes come after
   the first release, so mark the table and class rows "Later".

6. DS · Business patterns: in this round, only translate its text to English with the words above. Its new patterns
   (busy elsewhere as a plain reserved gap, the block-time action, the "uses the app" switch) come in round 2.

When done, list in the export's CHANGELOG every component you added, renamed or removed, and every place the English
copy needed a choice the list above doesn't cover.
```

## What to check on the canvas afterwards (Claude Code)

- No Turkmen left on the five boards except the Ý in the wordmark; words match chapter 2's glossary.
- No average bill; statuses with icon + label; money, numbers, dates and durations in the English format.
- The Example badge is neutral and appears on the four surfaces; the code step has the button, one lock message, the
  new-code action and the on-screen-code variant; the switcher hides with one language; the long-text block exists.
- Tables and classes marked "Later"; DS · Business patterns translated only.
