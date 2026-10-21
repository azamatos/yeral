# 2026-10-21 · The "Continue setting up" card's data (Q-200)

`GET /v1/me/setup` gives the draft's `category` (its name in the account's language), `logo` and `address` (`line` and
`city`, once a street is saved, the rule finishing reads) beside `slug`, `name` and `step`, in one query, for the
business sign-in's ContinueSetupCard (B-Login). The steps before `step` are done; the app numbers them (the phone is
B-Onboarding's first of 8). Stacked on #140 (the logo).

Review (one round): the address by the street saved, not the step; one query with the city joined; `logoOf()`; the
admin test's old answer shape; tests for the logo and for an address missing or kept when the wizard goes back. Left as
it is: `?lang=` (the account's endpoints, `/me/workspaces` and `/me/invites`, answer in the account's language); a
domain helper for "the steps done" waits for the app, which is its only reader.
