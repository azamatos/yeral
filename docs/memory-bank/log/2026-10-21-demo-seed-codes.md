# 2026-10-21 · The demo seed's booking codes

The flaky `bookings.test.ts` "Aýjemal sees her demo bookings" (activeContext, Next steps 3) had one cause: the seed
drew most booking codes from the crypto RNG and gave the design's bookings their own (YR-48213…) as it reached them. A
draw that matched a design code sent the design's booking off under another code, so it was missing from her lists
(YR-44650 once in CI, YR-47702 once locally).

`seed/codes.ts`: the seed's codes come from a fixed-start generator (`seededCodes`, the same order every run), never
take a demo code (`DEMO_CODES`), and a fixed code the data doesn't list, or gives twice, is an error. Every test
database gets the same codes, so any clash, with a code a test writes (`YR-10000` in calendar.test.ts) included, fails
every run or never. `codes.test.ts` fails on the old logic.

- Still a risk, not a failure: the seed checks codes against its own, not the database. The planned nightly reseed of
  one demo workspace (F-242) writes into a live database, where a visitor's booking may already hold a demo code or a
  generated one: it must check the table (or reseed into codes the api never issues).
- For the lead: Next steps 3 in activeContext is done.
