# The business app (ADR 0024): a static Vite build served by Caddy, behind the stack's front door like the api.
# Build from the repo root: docker build -f infra/docker/business.Dockerfile --build-arg YERAL_ENV=docker .
# The hosts are baked in at build time from YERAL_ENV and YERAL_DOMAIN (@yeral/lib/site), so one image per environment.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH TURBO_TELEMETRY_DISABLED=1 LEFTHOOK=0
RUN corepack enable
WORKDIR /repo

# 1. only what @yeral/business needs from the monorepo; turbo at the version the lockfile pins for the catalog
FROM base AS pruned
COPY . .
RUN TURBO=$(node -e "const m = /^catalogs:[\s\S]*?^ {4}turbo:\n {6}specifier: .*\n {6}version: (\S+)/m.exec(require('fs').readFileSync('pnpm-lock.yaml', 'utf8')); if (!m) throw new Error('turbo is missing from the lockfile catalog'); console.log(m[1])") \
  && pnpm dlx "turbo@$TURBO" prune @yeral/business --docker

# 2. install from the pruned lockfile (cached until a dependency changes), then build
FROM base AS build
COPY --from=pruned /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruned /repo/out/full/ .
# /version.json (the build stamp every app serves)
COPY --from=pruned /repo/scripts/version-stamp.mjs scripts/
ARG GITHUB_SHA=unknown
ARG YERAL_ENV=production
# empty = the domain @yeral/lib/site defaults to; a deployment on another domain passes its own
ARG YERAL_DOMAIN=
# the ways to reach Ýeral (book F-174), from the server's .env through deploy.sh; empty = not shown
ARG YERAL_SUPPORT_PHONE=
ARG YERAL_SUPPORT_TELEGRAM=
ARG YERAL_SUPPORT_EMAIL=
ENV GITHUB_SHA=$GITHUB_SHA VITE_YERAL_ENV=$YERAL_ENV VITE_YERAL_DOMAIN=$YERAL_DOMAIN \
  VITE_YERAL_SUPPORT_PHONE=$YERAL_SUPPORT_PHONE VITE_YERAL_SUPPORT_TELEGRAM=$YERAL_SUPPORT_TELEGRAM VITE_YERAL_SUPPORT_EMAIL=$YERAL_SUPPORT_EMAIL
RUN pnpm --filter @yeral/business run build

# 3. runtime: the files and a Caddy that answers every app address with index.html
FROM caddy:2-alpine AS runtime
COPY infra/docker/static.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/business/dist /srv
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/version.json || exit 1
