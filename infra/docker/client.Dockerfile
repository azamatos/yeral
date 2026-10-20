# The client site (ADR 0024): TanStack Start's server-side renderer on Node, behind the stack's front door like the api.
# Build from the repo root: docker build -f infra/docker/client.Dockerfile --build-arg YERAL_ENV=docker .
# The hosts are baked in at build time from YERAL_ENV and YERAL_DOMAIN (@yeral/lib/site), so one image per environment;
# the renderer reaches the api at API_INTERNAL_URL inside the stack (set at run time). The runtime image has no
# node_modules: Vite bundles the renderer and esbuild the server (apps/client/server.mjs) into dist/.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH TURBO_TELEMETRY_DISABLED=1 LEFTHOOK=0
RUN corepack enable
WORKDIR /repo

# 1. only what @yeral/client needs from the monorepo; turbo at the version the lockfile pins for the catalog
FROM base AS pruned
COPY . .
RUN TURBO=$(node -e "const m = /^catalogs:[\s\S]*?^ {4}turbo:\n {6}specifier: .*\n {6}version: (\S+)/m.exec(require('fs').readFileSync('pnpm-lock.yaml', 'utf8')); if (!m) throw new Error('turbo is missing from the lockfile catalog'); console.log(m[1])") \
  && pnpm dlx "turbo@$TURBO" prune @yeral/client --docker

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
ENV GITHUB_SHA=$GITHUB_SHA VITE_YERAL_ENV=$YERAL_ENV VITE_YERAL_DOMAIN=$YERAL_DOMAIN
RUN pnpm --filter @yeral/client run build

# 3. runtime: the built files and one Node process
FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/client/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:${PORT}/version.json || exit 1
CMD ["node", "dist/node.mjs"]
