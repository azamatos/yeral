# @yeral/contract

## 0.1.0

### Minor Changes

- [#17](https://github.com/azamatos/yeral/pull/17) [`292c035`](https://github.com/azamatos/yeral/commit/292c0356081295639eb76d814558c6507aa11f59) Thanks [@azamatos](https://github.com/azamatos)! - Every client screen's API: phone login with the design's code rules, profile, favourites, categories, search, business pages, reviews, free times for appointments, tables and classes, sending and managing bookings (cancel and undo, note, move, offered times, reviews), live updates, and the minute jobs that expire unanswered requests with alternative times, complete visits and send the SMS.

- [#15](https://github.com/azamatos/yeral/pull/15) [`bc4864c`](https://github.com/azamatos/yeral/commit/bc4864c0da941448ae26ad6be0bbfde9b424f394) Thanks [@azamatos](https://github.com/azamatos)! - The API contract for every client screen (catalogue, search, business page, free times, bookings, login, profile, favourites, live updates) with error codes, and their messages in Turkmen, Russian and English.

### Patch Changes

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - API contract fixes from review: login codes go to mobile numbers only; a service can't be listed twice in a booking; a booking start is 23:59 at the latest; a table for 9 or more people now gets `party_too_large` ("9 we ondan köp adam bolsa, jaň ediň") instead of a generic validation error; search needs both lat and lng and a map area with min ≤ max; the events cursor has a fixed format; a booking's type is `what.type` only.

- [#18](https://github.com/azamatos/yeral/pull/18) [`1b9975d`](https://github.com/azamatos/yeral/commit/1b9975df284cfcabca6087ce17eab42d6e20ab83) Thanks [@azamatos](https://github.com/azamatos)! - The typed api client for the apps: query and mutation options for every client screen, errors with the contract's codes, and live updates that refresh what other people changed.
- Updated dependencies [[`bc26121`](https://github.com/azamatos/yeral/commit/bc26121f71c0cfcadce5e511f4bcc74f96e47502), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878)]:
  - @yeral/domain@0.1.0
