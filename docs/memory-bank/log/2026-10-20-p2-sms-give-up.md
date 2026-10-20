# Late reminders dropped, a give-up alert line (feat/p2-3-sms-give-up)

- Changed: P2 step 3 (book Q-284). `sendBookingSms` (`jobs/run.ts`) settles a reminder (`reminderDay`, `reminder2h`,
  `reminderEvening`) unsent once the visit has started, recorded as `dropped: the visit has started (book Q-284)`
  like the old review asks. Any job's fifth failure also writes `log.error('job gave up', { id, kind, attempts,
  error })` (the error keeps link tokens hidden). The "how" is a 20.10.2026 row in chapter 9.
- Known: nobody is told yet: the alert needs error tracking (F-209, P2 step 7), which must alert on `job gave up`.
- Follow-ups: step 7 wires the error tracker to the api's error lines; the SMS gateway (Turkmenistan launch) is what
  will fail in practice.
