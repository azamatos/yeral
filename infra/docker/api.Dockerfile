# The api for the own server and the production-like local stack (ADR 0007).
# Build from the repo root: docker build -f infra/docker/api.Dockerfile .
# One bundled file (esbuild) + the SQL migrations; the runtime image has no node_modules.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH TURBO_TELEMETRY_DISABLED=1 LEFTHOOK=0
RUN corepack enable
WORKDIR /repo

# 1. only what @yeral/api needs from the monorepo; turbo at the version the lockfile pins for the catalog
FROM base AS pruned
COPY . .
RUN TURBO=$(node -e "const m = /^catalogs:[\s\S]*?^ {4}turbo:\n {6}specifier: .*\n {6}version: (\S+)/m.exec(require('fs').readFileSync('pnpm-lock.yaml', 'utf8')); if (!m) throw new Error('turbo is missing from the lockfile catalog'); console.log(m[1])") \
  && pnpm dlx "turbo@$TURBO" prune @yeral/api --docker

# 2. install from the pruned lockfile (cached until a dependency changes), then build
FROM base AS build
COPY --from=pruned /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruned /repo/out/full/ .
ARG GITHUB_SHA=unknown
ENV GITHUB_SHA=$GITHUB_SHA
RUN pnpm --filter @yeral/api run build

# 3. runtime
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3004
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:${PORT:-3004}/v1/health || exit 1
# migrations: `docker compose run --rm api node dist/cli.js migrate` (compose runs `setup` for the demo stack)
CMD ["node", "dist/node.js"]
