# 2026-10-20 · The design pass stops; design only where it's needed

- Owner, after rounds 3.1–3.4 were checked: "Do we really need all this detailed design? … we design when its really
  necessary for critical details". Recorded in ADR 0021 (amended), Q-133 (revised), chapter 9 (an owner row and a
  "How we work" row) and chapter 10 (P1 stopped; rounds 3.5–6.2 not drawn; P3 starts now).
- Prompts 3.5 and 4a.1 were written but not pasted. What 3.5 would have fixed is in the book and wins over the boards:
  reviewers show first name + initial, also to the business (B-Reviews and the DS review samples show full names
  after round 3.2); a yearly special day past midnight is checked against every weekday it may fall on; the hours
  list asks about every booking ahead, a waiting request there is declined; ReportMenu says "Replaces the earlier
  report" (Q-206) and BusinessStatusBanner gets a Hidden story (COMPONENTS.md lists only three). The rest was mock
  demo data.
- Also aligned: the book's README and chapter 1 (the new order; "Design to fix" now means build to the book), chapter
  2 and 6 (no redraw), C-02's English Home copy (it was only in the unpasted 4a.1), Q-010 revised (the admin tool on
  the business app's patterns), chapter 10 (owner's review moves to Storybook and the local app; the Russian-length
  check moves to the build), the ADR index.
- How to build now: the book for behaviour and words; the v0.6 boards for the design system and the business app;
  the v0.5 boards for the client site (layouts; write the English in the code's source); the business app's patterns
  for the admin tool; the nearest drawn pattern for anything else. The owner reviews built screens in Storybook and
  the local app. A Claude Design prompt (small, one piece) only for a critical detail with no drawn pattern.
- AGENTS.md's design-source paragraph now names export v0.6 and the stop.
- Next: P3, components in Storybook (`@yeral/ui` to v0.6, then the business app's new pieces), alongside the backend
  session's P2 work.
