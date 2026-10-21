# 2026-10-21 · The "Continue setting up" card's data (Q-200)

`GET /v1/me/setup` gives the draft's `category` (its name in the reader's language), `logo` and `address` (`line` and
`city`, only past the address step: the draft starts at the city's centre) beside `slug`, `name` and `step`, for the
business sign-in's ContinueSetupCard (B-Login). The steps before `step` are done; the app numbers them (the phone is
B-Onboarding's first of 8). Stacked on #140 (the logo).
