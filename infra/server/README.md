# The owner's server

A netcup VPS 1000 (4 vCPU, 8 GB, 128 GB, Ubuntu 24.04) in the EU, chosen 2026-10-19 for Ýeral's first launch and the
owner's other projects (ADR 0023). From this Mac it's `ssh yeral-vps` (an alias in `~/.ssh/config`, key login as root).

## Layout

| Path on the server | What | From the repo |
|---|---|---|
| `/srv/edge` | the shared Caddy: ports 80 and 443, HTTPS certificates for every project; each project adds `sites/<project>.caddy` | `infra/server/edge/` |
| `/srv/yeral` | Ýeral: Postgres 18 and the api; `.env` holds the database password (server only) | `infra/server/yeral/` |
| `/srv/yeral/src` | the source of the last deploy (a `git archive`), from which the api image is built | the repo |

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

`deploy.sh` builds the api image on the server, saves the database first
(`/srv/yeral/backup-<date>-before-<commit>.sql.gz`, mode 600; a failed dump stops the deploy; the way back from a bad
migration, operations.md "Rollback"), runs the migrations and the category catalogue (never the demo), starts the api
and checks `/v1/health`. `PUBLIC=1` also copies Ýeral's sites (`yeral.caddy`) to Caddy and reloads it: always, since
the DNS records point at the server (2026-10-22); without it a change to `yeral.caddy` doesn't ship. Delete old
backups by hand when the disk needs it.

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
4. Then the owner may delete the Worker `yeral-web` (the switch is confirmed); `apps/legacy` and its deploy option
   left the repo on 23.10.2026.

The apex serves the coming-soon page in `yeral.caddy` at every path, and `www` redirects to the apex. `business` and
`cms` answer with a certificate error until their apps join `yeral.caddy`: harmless, nobody is sent there before.

**E-mail records: not added yet** (the owner chooses later, 23.10.2026). `yeral.app` has none today, so anyone can send
mail in its name. Ýeral sends no e-mail; one of:

- **Lock it down** (no mail sent or received): DNS → Records, add

  | Type | Name | Content |
  |---|---|---|
  | TXT | `@` | `v=spf1 -all` |
  | TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` |
  | MX | `@` | mail server `.` (a single dot), priority 0: the null MX, "no mail received here" (skip it if the dashboard refuses the dot) |

- **Receive mail at an address** such as `hello@…`, forwarded to the owner's inbox: Email → Email Routing → Get
  started (it adds its own MX and SPF records), then only the `_dmarc` TXT record above. Sending stays off.

**When the client site is ready** it replaces the coming-soon page in `yeral.caddy`; no DNS change.

`storybook` stays as it is: a proxied record of the Worker `yeral-storybook`. Add no CAA record: Caddy falls back to
another certificate authority when Let's Encrypt fails, and the proxied records use Cloudflare's own.

## Still to do

- Deploys from GitHub Actions over SSH with the `deploy` user, after the owner approves a release (ADR 0020).
- The client site replaces the apex's coming-soon page in `yeral.caddy`; the business and cms sites join with their
  apps.
- With the real working MVP, before any real business's data (book chapter 10, P6; not for the demo launch, owner
  22.10.2026): a nightly database backup to Cloudflare R2 with the `media` volume and `.env`, which needs an R2 token
  the owner creates and puts in the server's `.env` (never in chat or git); error tracking and uptime alerts.
- IPv6: the server has an IPv6 address, but the `edge` network doesn't, so Docker's userland proxy would hand Caddy
  the gateway's address for every IPv6 visitor, and rate limits would lump them together. Until Docker's IPv6 is on
  (`"ipv6": true`, `"ip6tables": true`, the `edge` network recreated with IPv6; it touches every project on the
  server), publish only A records, no AAAA.
