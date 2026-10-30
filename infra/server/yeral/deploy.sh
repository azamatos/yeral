#!/usr/bin/env bash
# Builds the api, client and business images from the source in /srv/yeral/src, saves the database and (re)starts Ýeral. Run
# on the server as root:
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
# the sites: production hosts baked in at build time (@yeral/lib/site's default domain), and the ways to reach Ýeral
# (YERAL_SUPPORT_PHONE, YERAL_SUPPORT_TELEGRAM, YERAL_SUPPORT_EMAIL in .env, book F-174; one unset = not shown).
# Checked here first, by @yeral/lib/site's rules: a bad value would leave both sites blank (siteFromEnv throws at page
# load) and stop the api, after the old containers were replaced; the examples (EXAMPLE_BUSINESSES) need the phone
support_args=()
support_phone=
for name in YERAL_SUPPORT_PHONE YERAL_SUPPORT_TELEGRAM YERAL_SUPPORT_EMAIL; do
  # the value as compose reads it: the last line that sets it, surrounding quotes and whitespace dropped
  value=$(grep "^$name=" .env | tail -n1 | cut -d= -f2- | sed -E "s/^[[:space:]]*[\"']?//; s/[\"']?[[:space:]]*$//" || true)
  case $name in
  YERAL_SUPPORT_PHONE) pattern='^\+[1-9][0-9]{7,14}$' ;;
  YERAL_SUPPORT_TELEGRAM) pattern='^[A-Za-z][A-Za-z0-9_]{4,31}$' ;;
  *) pattern='^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' ;;
  esac
  if [ -n "$value" ] && ! [[ $value =~ $pattern ]]; then
    echo "$name in .env isn't valid (infra/server/README.md): nothing deployed" >&2
    exit 1
  fi
  [ "$name" = YERAL_SUPPORT_PHONE ] && support_phone=$value
  support_args+=(--build-arg "$name=$value")
done
if [ -z "$support_phone" ]; then
  echo 'add YERAL_SUPPORT_PHONE (and the Telegram and e-mail) to .env first, infra/server/README.md: nothing deployed' >&2
  exit 1
fi
business_image="yeral-business:${COMMIT:0:12}"
docker build -f src/infra/docker/business.Dockerfile --build-arg "GITHUB_SHA=$COMMIT" "${support_args[@]}" -t "$business_image" src
client_image="yeral-client:${COMMIT:0:12}"
docker build -f src/infra/docker/client.Dockerfile --build-arg "GITHUB_SHA=$COMMIT" "${support_args[@]}" -t "$client_image" src

# the images go into .env before any `docker compose` command reads compose.yml (the backup's dump is one): a variable
# it asks for and .env lacks would stop it (25.10.2026). Plain `docker compose ps|logs` in /srv/yeral work too.
sed -i '/^YERAL_API_IMAGE=/d;/^YERAL_BUSINESS_IMAGE=/d;/^YERAL_CLIENT_IMAGE=/d' .env
echo "YERAL_API_IMAGE=$image" >>.env
echo "YERAL_BUSINESS_IMAGE=$business_image" >>.env
echo "YERAL_CLIENT_IMAGE=$client_image" >>.env

# the database before the migrations, the way back from a bad one (operations.md, "Rollback"); readable by root only,
# and a failed dump stops the deploy. Nothing to save on the first deploy, before Postgres runs. Asked of Docker by the
# compose labels, not `docker compose ps`: that one needs every variable compose.yml asks for, and a new one not in .env
# yet made it fail quietly and the backup was skipped (25.10.2026).
postgres_running=$(docker ps -q --filter status=running \
  --filter label=com.docker.compose.project=yeral --filter label=com.docker.compose.service=postgres)
if [ -n "$postgres_running" ]; then
  backup="backup-$(date -u +%F)-before-${COMMIT:0:7}.sql.gz"
  if ! (umask 077 && docker compose exec -T postgres pg_dump -U yeral yeral | gzip >"$backup"); then
    rm -f "$backup"
    echo 'the database backup failed: nothing deployed' >&2
    exit 1
  fi
  echo "saved the database to /srv/yeral/$backup"
fi

docker compose up -d --wait --remove-orphans

if [ "${PUBLIC:-0}" = 1 ]; then
  cp src/infra/server/yeral/yeral.caddy /srv/edge/sites/yeral.caddy
  docker compose -f /srv/edge/compose.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile
fi

# the api answers inside its network
docker compose exec -T api wget -qO- http://127.0.0.1:3004/v1/health
echo
# and so do the business app and the client site
docker compose exec -T business wget -qO- http://127.0.0.1/version.json
echo
docker compose exec -T client wget -qO- http://127.0.0.1:3000/version.json
echo
docker image prune -f >/dev/null
