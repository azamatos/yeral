# Slice 7 L1: About, Help, Privacy, Terms

- What's there: `/{lang}/about`, `/help`, `/privacy`, `/terms` (`pages/static`, server rendered, in the sitemap), a «Ýeral» column in the
  footer, the terms line under the sign-in's number and the booking's Send (`shared/ui/terms-note`) and on the business app's sign-in.
- The words are in `apps/client/messages/pages.en.json`, loaded by these routes alone. `{brand}`, `{operator}` and `{country}` are filled
  in `StaticPage`; who runs Ýeral is `MARKET.legal`, the address `site.support.email`, and the page leaves the line out without one.
- The policy and terms are Claude's draft (Q-033), for the demo: no lawyer has read them. Each market's text is checked by a lawyer
  there before that market launches.
