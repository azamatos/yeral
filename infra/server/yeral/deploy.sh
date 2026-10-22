#!/usr/bin/env bash
# Builds the api image from the source in /srv/yeral/src, saves the database and (re)starts Ýeral. Run on the server
# as root:
#   COMMIT=<git sha> PUBLIC=1 bash /srv/yeral/src/infra/server/yeral/deploy.sh
# PUBLIC=1 also publishes Ýeral's sites (yeral.caddy) on the shared Caddy (the DNS records point here since 2026-10-22).
set -euo pipefail
cd /srv/yeral
COMMIT=${COMMIT:-unknown}

cp src/infra/server/yeral/compose.yml compose.yml
if [ ! -f .env ]; then
  umask 077
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" >.env
  echo 'created .env with a new database password'
fi
if ! grep -q '^ADMIN_SECRET_KEY=.' .env; then
  sed -i '/^ADMIN_SECRET_KEY=/d' .env
  echo "ADMIN_SECRET_KEY=$(openssl rand -base64 32)" >>.env
  echo 'added a new ADMIN_SECRET_KEY to .env (ADR 0026)'
fi

image="yeral-api:${COMMIT:0:12}"
docker build -f src/infra/docker/api.Dockerfile --build-arg "GITHUB_SHA=$COMMIT" -t "$image" src

# the database before the migrations, the way back from a bad one (operations.md, "Rollback"); readable by root only,
# and a failed dump stops the deploy. Nothing to save on the first deploy, before Postgres runs.
if docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  backup="backup-$(date -u +%F)-before-${COMMIT:0:7}.sql.gz"
  if ! (umask 077 && docker compose exec -T postgres pg_dump -U yeral yeral | gzip >"$backup"); then
    rm -f "$backup"
    echo 'the database backup failed: nothing deployed' >&2
    exit 1
  fi
  echo "saved the database to /srv/yeral/$backup"
fi

# the running image is kept in .env, so plain `docker compose ps|logs` in /srv/yeral work too
sed -i '/^YERAL_API_IMAGE=/d' .env
echo "YERAL_API_IMAGE=$image" >>.env
docker compose up -d --wait --remove-orphans

if [ "${PUBLIC:-0}" = 1 ]; then
  cp src/infra/server/yeral/yeral.caddy /srv/edge/sites/yeral.caddy
  docker compose -f /srv/edge/compose.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile
fi

# the api answers inside its network
docker compose exec -T api wget -qO- http://127.0.0.1:3004/v1/health
echo
docker image prune -f >/dev/null
