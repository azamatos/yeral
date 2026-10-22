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
ssh yeral-vps "COMMIT=$(git rev-parse HEAD) bash /srv/yeral/src/infra/server/yeral/deploy.sh"
```

`deploy.sh` builds the api image on the server, runs the migrations and the category catalogue (never the demo), starts
the api and checks `/v1/health`. With `PUBLIC=1` it also adds Ýeral's sites to Caddy: do that only once the DNS record
`api.yeral.app` → the server's address exists (DNS only, not proxied). Until then the api is reachable only inside the
server.

## DNS records

The zone `yeral.app` is on Cloudflare (ADR 0024; the plan: book chapter 9, 22.10.2026). The owner edits it in the dashboard:
yeral.app → DNS → Records. The server's IPv4 address is the `hostname` of `ssh -G yeral-vps`.

Every record that points at the server is **DNS only** (the grey cloud, not proxied): Caddy gets its own certificates
from Let's Encrypt, and it must see each visitor's real address, since the api's rate limits count by it. TTL Auto.
Only A records, no AAAA (IPv6, below).

**Now** (the owner, 22.10.2026):

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `api` | the server's IPv4 address | DNS only |
| A | `business` | the server's IPv4 address | DNS only |
| A | `cms` | the server's IPv4 address | DNS only |
| TXT | `@` | `v=spf1 -all` | — |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` | — |

The two TXT records tell mail servers that no mail ever comes from `yeral.app` (Ýeral sends no e-mail), so nobody can
send mail in its name. `api` serves once a deploy runs with `PUBLIC=1` (above). `business` and `cms` answer with a
certificate error until their apps join `yeral.caddy`: harmless, nobody is sent there before.

**At the first launch** (once the new client site is deployed to the server and its hosts are in `yeral.caddy`):

1. Workers & Pages → `yeral-web` (the legacy site, `apps/legacy/wrangler.jsonc`) → Settings → Domains & Routes:
   remove `yeral.app` and `www.yeral.app`. Then DNS → Records should hold no record named `yeral.app` or `www`;
   delete any left.
2. DNS → Records: A `@` and A `www` → the server's IPv4 address, DNS only. `www` redirects to the apex in
   `yeral.caddy`.
3. Claude reloads Caddy, which gets the certificates at once, and checks both addresses.

`storybook` stays as it is: a proxied record of the Worker `yeral-storybook`. Add no CAA record: Caddy falls back to
another certificate authority when Let's Encrypt fails, and the proxied records use Cloudflare's own.

## Still to do

- Deploys from GitHub Actions over SSH with the `deploy` user, after the owner approves a release (ADR 0020).
- The client, business and cms sites join `yeral.caddy` with their apps (`www` → the apex with the client site).
- With the real working MVP, before any real business's data (book chapter 10, P6; not for the demo launch, owner
  22.10.2026): a nightly database backup to Cloudflare R2 with the `media` volume and `.env`, which needs an R2 token
  the owner creates and puts in the server's `.env` (never in chat or git); error tracking and uptime alerts.
- IPv6: the server has an IPv6 address, but the `edge` network doesn't, so Docker's userland proxy would hand Caddy
  the gateway's address for every IPv6 visitor, and rate limits would lump them together. Until Docker's IPv6 is on
  (`"ipv6": true`, `"ip6tables": true`, the `edge` network recreated with IPv6; it touches every project on the
  server), publish only A records, no AAAA.
