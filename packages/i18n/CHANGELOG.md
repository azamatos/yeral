# @yeral/i18n

## 0.1.0

### Minor Changes

- [#17](https://github.com/azamatos/yeral/pull/17) [`292c035`](https://github.com/azamatos/yeral/commit/292c0356081295639eb76d814558c6507aa11f59) Thanks [@azamatos](https://github.com/azamatos)! - Every client screen's API: phone login with the design's code rules, profile, favourites, categories, search, business pages, reviews, free times for appointments, tables and classes, sending and managing bookings (cancel and undo, note, move, offered times, reviews), live updates, and the minute jobs that expire unanswered requests with alternative times, complete visits and send the SMS.

- [#15](https://github.com/azamatos/yeral/pull/15) [`bc4864c`](https://github.com/azamatos/yeral/commit/bc4864c0da941448ae26ad6be0bbfde9b424f394) Thanks [@azamatos](https://github.com/azamatos)! - The API contract for every client screen (catalogue, search, business page, free times, bookings, login, profile, favourites, live updates) with error codes, and their messages in Turkmen, Russian and English.

- [#14](https://github.com/azamatos/yeral/pull/14) [`6e750bc`](https://github.com/azamatos/yeral/commit/6e750bcd65f5498a2522541142596f99dc3ad34b) Thanks [@azamatos](https://github.com/azamatos)! - Turkmen, Russian and English: shared messages (brand, the five statuses, months and weekdays) and formatters for money, prices, ratings, durations, distances, dates and times exactly as the design prints them.

### Patch Changes

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - Formats: 996 m reads `1 km` (not `1 000 m`); times after midnight wrap (`01:00`, `24:00` stays for a day ending at midnight); relative days use the weekday only within the coming week and the date otherwise; the "9 or more people" message takes the limit as an argument.
- Updated dependencies [[`bc26121`](https://github.com/azamatos/yeral/commit/bc26121f71c0cfcadce5e511f4bcc74f96e47502), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878)]:
  - @yeral/domain@0.1.0
