# 2026-10-21 · The demo seed's booking codes

The flaky `bookings.test.ts` "Aýjemal sees her demo bookings" (activeContext, Next steps 3) had one cause: the seed
generated random codes for most bookings and gave the design's bookings their own (YR-48213…) as it reached them. A
generated code that happened to match one sent the design's booking off under another code, so it was missing from her
lists (YR-44650 once in CI, YR-47702 once locally). `seed/codes.ts`: the demo data's codes are reserved before any is
generated, and a code given twice is an error; `codes.test.ts` fails on the old logic.

For the lead: Next steps 3 in activeContext is done.
