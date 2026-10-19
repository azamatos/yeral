# 0023. One code base, one deployment per market

- Status: Accepted 2026-10-18; revised 2026-10-19: the first launch runs on the owner's own server, not on Cloudflare
- Decided by: owner (one deployment per country, first launch on Cloudflare, Turkmenistan later on its own servers:
  product book Q-131, Q-032, Q-037, 18.10.2026) + Claude (what a deployment holds, what stays shared)

## Context

Ýeral is built in English and isn't bound to one country; each country it launches in adds its languages and settings
([0022](0022-english-first-any-country.md)). Countries also make their own data rules: Turkmenistan's law No. 519-V
says personal data sent abroad must also be stored in Turkmenistan, and Uzbekistan has a similar rule (product book
Q-037, Q-131). Fresha, the reference product, runs one site for every country.

On 18.10.2026 the owner chose one deployment per country (Q-131), a first launch on Cloudflare that investors and early
users in Turkmenistan reach through a VPN (Q-032), and servers in Turkmenistan only for the Turkmenistan launch, after
investment (Q-037). [0007](0007-hosting-cloudflare-now-docker-later.md) already runs everything on Cloudflare now, with
an own server (Docker + nginx) later.

## Decision

- **A market is a deployment.** One code base and one release; each market runs its own copy: client site, business
  app, CMS, api, jobs and its own database, under its own addresses. No data is shared between markets.
- **A market's settings** live in one place and are read at runtime: languages and the default one, currency and money
  format, phone code and number rules, time zone, SMS provider and sender, legal texts, map area. Nothing
  country-specific is hard-coded (AGENTS rule 5).
- **The first launch** is one market, in English, on the owner's own server: a netcup VPS 1000 in the EU, running the
  Docker stack of ADR 0007 behind a shared HTTPS front door (the server also hosts the owner's other projects), with
  Cloudflare for DNS and R2 for backups (revised 2026-10-19; it was Cloudflare Workers with Neon). It runs with
  Turkmenistan's settings (manats, +993, Ashgabat time). It's a pilot: example businesses beside real ones, and no SMS (the sign-in code shows on the screen) (product book
  Q-004, Q-036).
- **The Turkmenistan launch** moves that market, or starts a new one, onto servers in Turkmenistan with the Docker
  Compose stack (ADR 0007's "later"), adding Turkmen and Russian. Its operator and addresses are decided then.
- **One account per market.** A person who uses two markets has two accounts. Cross-market features (one login, search
  across countries) are out of scope until a second market is real.

## Consequences

- Easier: each country's data stays where its law wants it; a market can be hosted by a local operator; a problem in one
  market doesn't touch another.
- Harder: every release is deployed once per market; migrations run per market; there's no shared view across
  countries (the Ýeral team uses each market's CMS).
- Now: build the market settings as configuration while coding (ADR 0022 lists the constants to replace). Nothing else
  changes for the first launch.
- Servers: the owner's netcup VPS 1000 (EU, bought 2026-10-19) runs the first launch; the Turkmenistan deployment
  needs a second one inside the country (product book chapter 1,
  "Launch").

## Alternatives considered

- One site and one database for every country (Fresha): simpler to run and allows cross-country features, but breaks
  data rules like Turkmenistan's and ties every country to one host.
- One site, a database per country: keeps data apart but still needs one host every country can reach and accepts.
