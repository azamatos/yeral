# The owner's server

A netcup VPS 1000 (4 vCPU, 8 GB, 128 GB, Ubuntu 24.04) in the EU, chosen 2026-10-19 for Ýeral's first launch and the
owner's other projects (ADR 0023). From this Mac it's `ssh yeral-vps` (an alias in `~/.ssh/config`, key login as root).

## Layout

| Path on the server | What | From the repo |
|---|---|---|
| `/srv/edge` | the shared Caddy: ports 80 and 443, HTTPS certificates for every project; each project adds `sites/<project>.caddy` | `infra/server/edge/` |
| `/srv/yeral` | Ýeral: Postgres 18, the api, the client site and the business app; `.env` holds the database password (server only) | `infra/server/yeral/` |
| `/srv/yeral/src` | the source of the last deploy (a `git archive`), from which the api, client and business images are built | the repo |

Projects share the Docker network `edge`; only Caddy publishes ports, so the firewall (SSH, 80, 443) is the whole
surface. Each project has its own compose project, network, database and memory limits.

## Setting up a fresh server (done 2026-10-19)

```
ssh yeral-vps 'cat > /root/setup.sh' < infra/server/setup.sh
ssh yeral-vps 'bash /root/setup.sh'
ssh yeral-vps 'mkdir -p /srv/edge/sites'
ssh yeral-vps 'cat > /srv/edge/compose.yml' < infra/server/edge/compose.yml
ssh yeral-vps 'cat > /srv/edge/Caddyfile' < infra/server/edge/Caddyfile
ssh yeral-vps 'docker compose -f /srv/edge/compose.yml up -d'
```

`setup.sh`: packages and updates, UTC, 2 GB swap, SSH keys only, the firewall, fail2ban, automatic security updates,
Docker with log rotation, the `edge` network, a `deploy` user for automated deploys later.

## Deploying Ýeral by hand

From the repo root, at the commit to deploy:

```
git archive --format=tar HEAD > /tmp/yeral-src.tar
ssh yeral-vps 'rm -rf /srv/yeral/src && mkdir -p /srv/yeral/src && tar -x -C /srv/yeral/src' < /tmp/yeral-src.tar
ssh yeral-vps "COMMIT=$(git rev-parse HEAD) PUBLIC=1 bash /srv/yeral/src/infra/server/yeral/deploy.sh"
```

**Once, before the first deploy with the support contacts in the config** (30.10.2026, book chapter 9): add the ways
to reach Ýeral to `/srv/yeral/.env` (mode 600; the real phone and Telegram are the owner's own and never go in the
repo, so this file names placeholders):

```
ssh yeral-vps 'cat >> /srv/yeral/.env' <<'EOF'
YERAL_SUPPORT_PHONE=<the owner's phone, E.164: +993…>
YERAL_SUPPORT_TELEGRAM=<the owner's Telegram username, without @>
YERAL_SUPPORT_EMAIL=hello@yeral.app
EOF
```

`deploy.sh` reads them from `.env`: the api gets them from the compose environment (the example businesses' phone),
the client site and the business app bake them in at build time (build args → `VITE_YERAL_SUPPORT_*`), so a change
needs a deploy. One left empty isn't shown. `deploy.sh` refuses to deploy before anything is built when the phone is
missing (the examples need it) or a value breaks the rules (the phone E.164 and the market's, the Telegram name
without `@`, a plain e-mail): a bad one would leave both sites blank.

`deploy.sh` builds the api, client and business images on the server, saves the database first
(`/srv/yeral/backup-<date>-before-<commit>.sql.gz`, mode 600; a failed dump stops the deploy; the way back from a bad
migration, operations.md "Rollback"), runs the migrations and the category catalogue (never the demo), starts the api
the client site and the business app, and checks the api's `/v1/health` and both sites' `/version.json`. `PUBLIC=1` also copies Ýeral's sites (`yeral.caddy`) to Caddy and reloads it: always, since
the DNS records point at the server (2026-10-22); without it a change to `yeral.caddy` doesn't ship. Delete old
backups by hand when the disk needs it.

While the sign-in code shows on the screen, one of the owner's test businesses opens to clients as an "Example" (still
confirming by hand) with `ssh yeral-vps 'docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js
make-example <slug>'`, and loses the mark (back to "in review") with `make-example <slug> --off` (operations.md).

**After a deploy that changed the headers** (`yeral.caddy` or the client site's policy, "Security headers" below),
with the browser console open and no CSP violation reported (`Refused to load…` / `violates the following Content
Security Policy directive`):

1. `https://business.yeral.app`: sign in, the setup's done step (the page QR and its downloads), Settings → Address
   (the map, with tiles and the pin), Settings → Photos (uploaded photos), the calendar day (its layers, a request's
   drawer).
2. `https://yeral.app`: a business page with photos and the map, its booking (the calendar, the time, the confirm),
   My bookings (live updates: the events stream stays connected in the Network tab).
3. `curl -sI https://yeral.app/en https://business.yeral.app/login https://api.yeral.app/v1/health | grep -i
   'strict-transport\|content-security'`: HSTS on every site, a policy on each.

**Rolling the site file back:** `deploy.sh` keeps the previous `yeral.caddy` as `/srv/edge/sites-yeral.caddy.before-<commit>`
(and `-latest`); `ssh yeral-vps 'cp /srv/edge/sites-yeral.caddy.before-latest /srv/edge/sites/yeral.caddy && docker
compose -f /srv/edge/compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile'` puts it back in seconds,
no image rebuilt. The client site's own policy rolls back with its image (the previous commit deployed the same way).

## Security headers

`yeral.caddy`'s `(yeral_site)` sends every site `Strict-Transport-Security "max-age=31536000; includeSubDomains"`
(a year of HTTPS only, every `*.yeral.app` host being on TLS already: "DNS records"; no `preload`, which a browser
list keeps for months), `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin` and
`X-Frame-Options SAMEORIGIN` (`www`'s redirect included). The Content Security Policy is per site, written from an inventory of what each app
loads (`docs/memory-bank/log/2026-10-30-hsts-csp.md`; nothing is allowed on a guess):

| Site | Policy | Set by |
|---|---|---|
| `api.yeral.app` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` (JSON, photos, the OpenAPI document load nothing); `/docs` only `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` until Scalar's CDN bundle is inventoried | `yeral.caddy` |
| `business.yeral.app` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.yeral.app; font-src 'self'; connect-src 'self' https://api.yeral.app https://tiles.openfreemap.org; worker-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'` | `yeral.caddy` |
| `yeral.app` | the business app's, with `script-src 'self' 'nonce-…'`: a nonce per page on the scripts TanStack Start writes inline (hydration, React's streaming), so Caddy sets none here | the app: `apps/client/src/app/entrypoint/csp.ts`, `start.ts` |

`infra/docker/Caddyfile` mirrors it for the production-like stack, where CI's «Docker stack» job asserts the headers
on every site and that the client page's nonce is on the header and on each of its scripts. No `report-uri`: nobody
would read it (error tracking comes with P6). A new third-party host (a CDN, an analytics script) means a new line in
the inventory and the policy, never `'unsafe-inline'` for scripts.

## DNS records

The zone `yeral.app` is on Cloudflare (ADR 0024; the plan: book chapter 9, 22.10.2026). The owner edits it in the dashboard:
yeral.app → DNS → Records. The server's IPv4 address is the `hostname` of `ssh -G yeral-vps`.

Every record that points at the server is **DNS only** (the grey cloud, not proxied): Caddy gets its own certificates
from Let's Encrypt, and it must see each visitor's real address, since the api's rate limits count by it. TTL Auto.
Only A records, no AAAA (IPv6, below).

**Done 22.10.2026** (the owner; the old site is retired, and the apex shows a coming-soon page from the server until
the client site takes it over; live since 2026-10-22 21:18 UTC):

1. Workers & Pages → `yeral-web` (the old site) → Settings → Domains & Routes: remove `yeral.app` and
   `www.yeral.app`. Then DNS → Records should hold no record named `yeral.app` or `www`; delete any left.
2. DNS → Records, add:

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `@` | the server's IPv4 address | DNS only |
   | A | `www` | the server's IPv4 address | DNS only |
   | A | `api` | the server's IPv4 address | DNS only |
   | A | `business` | the server's IPv4 address | DNS only |
   | A | `cms` | the server's IPv4 address | DNS only |

3. Claude deploys with `PUBLIC=1` (above): Caddy gets the certificates, and Claude checks `https://yeral.app`, the
   `www` redirect and `https://api.yeral.app/v1/health`. Between steps 1 and 3 the apex shows nothing for a few
   minutes.
4. The owner deleted the Worker `yeral-web` on 23.10.2026; `apps/legacy` and its deploy option left the repo the same
   day.

The apex serves the client site (the owner, 25.10.2026: it replaced the coming-soon page so booking can be tried
live; `X-Robots-Tag: noindex` until the first launch), and `www` redirects to the apex. `business` serves the business
app since 25.10.2026 (the owner: to try it live, with the sign-in code on the screen). `cms`
answers with a certificate error until its app joins `yeral.caddy`: harmless, nobody is sent there before.

**E-mail: received at `hello@yeral.app`, nothing sent** (the owner's choice, 23.10.2026). Cloudflare Email Routing
(free) forwards mail for the address to the owner's inbox; Ýeral sends no e-mail. The owner sets it up:

1. yeral.app → Email → Email Routing → Get started.
2. Custom address `hello`, action "Send to an email", destination the owner's inbox; Create and continue.
3. Open the verification mail Cloudflare sends there; Verify email address.
4. Add records and enable: Cloudflare adds its own records; leave them as they are:

   | Type | Name | Content |
   |---|---|---|
   | MX | `@` | `route1.mx.cloudflare.net` (Cloudflare picks the priorities) |
   | MX | `@` | `route2.mx.cloudflare.net` |
   | MX | `@` | `route3.mx.cloudflare.net` |
   | TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
   | TXT | `cf2024-1._domainkey` | the DKIM key |

5. DNS → Records, add one record by hand, so that nobody can send mail in yeral.app's name:

   | Type | Name | Content |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` |

6. Test from another account: a mailbox that sends to itself through a forward may hide the copy.

The catch-all stays off (spam); another address (`support@`) is one more custom address. Replies go out from the
owner's own address. Sending as `hello@` needs a sending service later; a Gmail "Send mail as" alias through Gmail's own
servers would fail DMARC and be rejected.

**The client site** replaced the coming-soon page in `yeral.caddy` (25.10.2026); no DNS change. At the first launch
the apex's `X-Robots-Tag` goes, so search engines may read it.

`storybook` stays as it is: a proxied record of the Worker `yeral-storybook`. Add no CAA record: Caddy falls back to
another certificate authority when Let's Encrypt fails, and the proxied records use Cloudflare's own.

## Still to do

- Deploys from GitHub Actions over SSH with the `deploy` user, after the owner approves a release (ADR 0020).
- The cms site joins `yeral.caddy` with its app (the business app and the client site joined 25.10.2026); the
  apex's `noindex` goes at the first launch.
- With the real working MVP, before any real business's data (book chapter 10, P6; not for the demo launch, owner
  22.10.2026): a nightly database backup to Cloudflare R2 with the `media` volume and `.env`, which needs an R2 token
  the owner creates and puts in the server's `.env` (never in chat or git); error tracking and uptime alerts.
- IPv6: the server has an IPv6 address, but the `edge` network doesn't, so Docker's userland proxy would hand Caddy
  the gateway's address for every IPv6 visitor, and rate limits would lump them together. Until Docker's IPv6 is on
  (`"ipv6": true`, `"ip6tables": true`, the `edge` network recreated with IPv6; it touches every project on the
  server), publish only A records, no AAAA.
