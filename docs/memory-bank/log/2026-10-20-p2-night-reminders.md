# Reminders keep out of the night (feat/p2-3-night-reminders)

- Changed: P2 step 3, part 3 (book Q-285, with Q-257 kept). `reminderPlan(visitStart, now)` in
  `@yeral/domain/lifecycle`: reminders a day and 2 hours before; one that would arrive between 22:00 and 08:00 goes at
  21:30 the evening before the visit as `reminderEvening` (the "tomorrow" text), and when both would, only one goes;
  a reminder already due at booking time is left out. `queueBookingSms` uses it; the job runner sends `reminderEvening`
  if either reminder switch is on.
- Decided: chapter 8's "the evening before the visit" wins over the plan's earlier "before that night starts" (chapter
  9's P2 review row corrected).
- Follow-ups: activeContext: step 3 runs; past midnight, holds and night reminders done; next the city as data (Q-107)
  and the rest of step 3's list.
