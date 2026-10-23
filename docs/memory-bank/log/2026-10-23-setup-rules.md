# 2026-10-23 · The setup wizard's booking rules step (P4 slice 2)

- `@yeral/ui` (#163): **SettingsRow** (`settings-row`, DS-Patterns `.y-sr`): the label 15/22 500 and its help on the
  left (`flex 1 1 280`), the control on the right (`flex 0 1 320`), wrapping when narrow; `htmlFor` / `labelId` /
  `descriptionId` wire the names. **OptionCard** `size="l"` (B-Onboarding `.rcard`: the 44 icon tile, a `tag` pill,
  `trailing` under the caption, the radio in the corner) and `indicator="start"` (`.rro`).
- The business app: `pages/setup/ui/rules-step.tsx` (B-Onboarding `isRules`, book B-05, B-42), a hook like the address
  step (`useRulesStep(slug, on)`): «I confirm» (Recommended) or instant, each with what the client sees; the hold
  (manual); «Who answers requests?» once someone besides the owner with the app is in the workspace (`sdk.team.list`);
  the instant note; the free cancel window and the buffer; «You can change all of this later in Settings.». `save`
  sends only what changed through `settings.updateRules`. `model/rules.ts` holds the form's rules (unit-tested).
- Choices made: chapter 9, 23.10.2026, B-05, B-42 (how).
- Follow-ups: the api doesn't show a draft's team (`GET /v1/w/{slug}/team` needs `requireMember(…, { draft: true })`
  or a «has a team» fact on `GET /v1/me/setup`), so «Who answers requests?» stays hidden in the wizard until then; the
  step list's summary for this step («I confirm · 30 min») needs the rules in `GET /v1/me/setup` (or
  the step's own query while it isn't shown); Settings → Booking rules reuses SettingsRow and the option cards.
