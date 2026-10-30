# The ways to reach Ýeral out of the repo, `hello@yeral.app` beside them (feat/support-line-config)

- Decision (owner 27.10, confirmed 30.10; book chapter 9, 30.10.2026): the support phone and Telegram hard-coded in
  `MARKET.support` were the owner's own contacts, so they leave the repo for each deployment's configuration, the way
  the domain does; Ýeral's e-mail `hello@yeral.app` (received through Cloudflare Email Routing, 23.10) becomes a third
  way, shown wherever Contact Ýeral is. The old values stay in the git history; the product book no longer prints them.
- Changed:
  - `@yeral/lib/site`: `Support` (`phone?` E.164, `telegram?` without `@`, `email?`), `site.support` from
    `YERAL_SUPPORT_PHONE`, `YERAL_SUPPORT_TELEGRAM`, `YERAL_SUPPORT_EMAIL` (`VITE_` in the apps), each optional and
    validated like the other site variables (a bad one named, its value never printed). The phone is checked as E.164
    only: `lib` imports nothing internal (systemPatterns), so the market's own rules stay in `@yeral/domain`.
  - `@yeral/domain/market`: `Support` and `MARKET.support` are gone; the market keeps what is country-specific.
  - `@yeral/features/contact-yeral`: `supportLine(support)` and `supportLinks(support, words)` take the config; the
    ways that are set come in the drawn order Call · Write on Telegram · Write an e-mail (the Telegram row's pattern,
    `Mail` icon, a `mailto:` link in place). None set: no links.
  - The business app: `SUPPORT_LINE` in `shared/config`; `ContactYeral`/`ContactYeralLink`/`useContactYeral` take an
    optional `support` (stories) and render nothing without a way; More's caption lists the ways that are set
    (`support.way.*`); the wizard's «Questions?» line names the first way that is set, or goes. The client site's
    `ContactYeralLink` the same. New words: `support.email` («Write an e-mail»), `support.way.telegram`,
    `support.way.email`; `setup.questions` takes `{contact}`.
  - The api: `examplePhone` is `EXAMPLE_PHONE`, else the support phone, else null; `EXAMPLE_BUSINESSES=true` without
    either is a config error naming both.
  - Infra: `client.Dockerfile` and `business.Dockerfile` take the three as build args (→ `VITE_*`); `deploy.sh` reads
    them from `/srv/yeral/.env` and passes them; the server's `compose.yml` hands them to the api (`${…:-}`).
    `.env.example` (api, server) document them with placeholders. Storybook sets placeholders in
    `.storybook/env.ts` (a number in the market's unused range, `yeral_support`, `hello@example.com`), imported by
    `main.ts` and `vitest.config.ts`.
  - Tests: `site.test.ts` (set, unset, empty, each bad variable named), `support-line.test.ts` (all, some, none),
    the api's `config.test.ts`, ContactMenu stories Menu (all three) · PhoneOnly · None · Sheet.
- How the variables reach each build: `deploy.sh` builds the sites on the server with `--build-arg` from `.env`
  (before this, only `GITHUB_SHA` was passed; the hosts came from the Dockerfiles' defaults). The api reads its
  compose environment at start.
- Left: the owner adds the three lines to `/srv/yeral/.env` and deploys (`infra/server/README.md`, "Deploying Ýeral
  by hand"); until then the deployed sites keep the old values baked in, and the next deploy without the lines would
  show no Contact Ýeral and refuse `EXAMPLE_BUSINESSES` without a phone. The local Docker stack (`infra/docker`)
  passes no support: Contact Ýeral isn't shown there.
