# @yeral/api

## 0.1.0

### Minor Changes

- [#17](https://github.com/azamatos/yeral/pull/17) [`292c035`](https://github.com/azamatos/yeral/commit/292c0356081295639eb76d814558c6507aa11f59) Thanks [@azamatos](https://github.com/azamatos)! - Every client screen's API: phone login with the design's code rules, profile, favourites, categories, search, business pages, reviews, free times for appointments, tables and classes, sending and managing bookings (cancel and undo, note, move, offered times, reviews), live updates, and the minute jobs that expire unanswered requests with alternative times, complete visits and send the SMS.

- [#19](https://github.com/azamatos/yeral/pull/19) [`8518d67`](https://github.com/azamatos/yeral/commit/8518d67978577a57a54cd1c4a73f5ec42ea6e730) Thanks [@azamatos](https://github.com/azamatos)! - The api runs in Docker behind nginx (one command brings up the whole stack locally) and is ready for Cloudflare Workers with Hyperdrive and a minute cron for its jobs.

- [#16](https://github.com/azamatos/yeral/pull/16) [`543713b`](https://github.com/azamatos/yeral/commit/543713ba94cee87fd045b47f5df440e75ffa2ea4) Thanks [@azamatos](https://github.com/azamatos)! - The api's foundation: health, build stamp and OpenAPI docs, the database schema for clients and businesses with protection against double booking, and the design's demo data as a seed.

### Patch Changes

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - A booking's `active` flag is computed by Postgres from its status (and copied to its items by a trigger), so the no-overlap constraints follow every status change, whoever makes it.

- [#23](https://github.com/azamatos/yeral/pull/23) [`4e71dac`](https://github.com/azamatos/yeral/commit/4e71dac40ccaa498daf91e911333df97f8e954e5) Thanks [@azamatos](https://github.com/azamatos)! - Review of the follow-ups: hidden service prices keep their amount private on the public business page; an events cursor out of range starts over instead of failing; asking for tables at an unknown business answers 404 before "9 or more people"; the 14-day strip stops at the first free time of each day.

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - Safer, truer demo data: seeding refuses to run without an explicit environment (so a server never gets its data wiped by default) and leaves the database untouched if it fails; the demo looks as designed on every weekday (opening hours, team shifts, yoga classes and their taken seats); demo table bookings use the restaurant's sitting time; demo photos also show when the api runs from its build.

- [#19](https://github.com/azamatos/yeral/pull/19) [`8518d67`](https://github.com/azamatos/yeral/commit/8518d67978577a57a54cd1c4a73f5ec42ea6e730) Thanks [@azamatos](https://github.com/azamatos)! - Sturdier api hosting: an error before the database is ready still answers with the JSON error body and is logged; on Workers a request connects to the database only when it needs it, the minute jobs never run twice at once and log their failures, and a deploy without an environment fails loudly; behind nginx a client can no longer fake its IP address for the rate limits.

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - API contract fixes from review: login codes go to mobile numbers only; a service can't be listed twice in a booking; a booking start is 23:59 at the latest; a table for 9 or more people now gets `party_too_large` ("9 we ondan köp adam bolsa, jaň ediň") instead of a generic validation error; search needs both lat and lng and a map area with min ≤ max; the events cursor has a fixed format; a booking's type is `what.type` only.
- Updated dependencies [[`292c035`](https://github.com/azamatos/yeral/commit/292c0356081295639eb76d814558c6507aa11f59), [`bc4864c`](https://github.com/azamatos/yeral/commit/bc4864c0da941448ae26ad6be0bbfde9b424f394), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878), [`bc26121`](https://github.com/azamatos/yeral/commit/bc26121f71c0cfcadce5e511f4bcc74f96e47502), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878), [`6e750bc`](https://github.com/azamatos/yeral/commit/6e750bcd65f5498a2522541142596f99dc3ad34b), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878), [`6e750bc`](https://github.com/azamatos/yeral/commit/6e750bcd65f5498a2522541142596f99dc3ad34b), [`1b9975d`](https://github.com/azamatos/yeral/commit/1b9975df284cfcabca6087ce17eab42d6e20ab83)]:
  - @yeral/i18n@0.1.0
  - @yeral/contract@0.1.0
  - @yeral/domain@0.1.0
  - @yeral/lib@0.1.0
