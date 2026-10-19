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

## Still to do

- Deploys from GitHub Actions over SSH with the `deploy` user, after the owner approves a release (ADR 0020).
- A nightly database backup to Cloudflare R2: needs an R2 token, which the owner creates and puts in the server's
  `.env` (never in chat or git).
- The client, business and cms sites join `yeral.caddy` with their apps.
- IPv6: the server has an IPv6 address, but the `edge` network doesn't, so Docker's userland proxy would hand Caddy
  the gateway's address for every IPv6 visitor, and rate limits would lump them together. Until Docker's IPv6 is on
  (`"ipv6": true`, `"ip6tables": true`, the `edge` network recreated with IPv6; it touches every project on the
  server), publish only A records, no AAAA.
