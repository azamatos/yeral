# Lateness fixed at 15 minutes (feat/p2-3-fixed-lateness)

- Changed: P2 step 3 (book Q-118, F-103). `LATE_MINUTES = 15` (`@yeral/domain/rules`) replaces the per-business
  `lateToleranceMinutes` in `BookingRules`, `DEFAULT_RULES` and `rulesErrors`; the business page's
  `rules.lateToleranceMinutes` (contract unchanged) always says 15. The demo seed stops setting it. Nothing in the
  engine used it: it was shown only.
- Kept: the `booking_rules.late_tolerance_minutes` column, unused, for F-103 (a setting next to the cancel window,
  none to 30 min). The "how" is a 20.10.2026 row in chapter 9.
- Follow-ups: step 4's settings endpoints take no lateness; F-103 (Later) brings the field back to `BookingRules`.
