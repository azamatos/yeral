# The business app live at business.yeral.app (#192, infra/business-on-server; fix/deploy-backup-check)

- Changed: the server builds and runs the business app (`deploy.sh` builds `yeral-business:<sha>` from
  `infra/docker/business.Dockerfile`; compose's `business` service on the `edge` network as `yeral-business`;
  `business.yeral.app` in `yeral.caddy`), and the api shows the sign-in code on the screen
  (`SIGN_IN_CODE_ON_SCREEN: 'true'`).
- Decided: the owner, 25.10.2026 ("i dont wanna check locally, go live on our domains"; asked, chose the business app
  only and the code on the screen open to anyone, test data only); the book's chapter 9, 25.10.2026.
- Deployed: main at 07952fd with `PUBLIC=1`, 2026-10-25 08:42 UTC. Migration 0042 and the starter services applied;
  `https://business.yeral.app` answers 200 with its `/version.json`, `noindex` and the shared headers;
  `GET /v1/auth/mode` says `codeOnScreen: true`; the apex still shows the coming-soon page.
- Incident: that deploy skipped its database backup. The check `docker compose ps … | grep -qx postgres` needs every
  variable `compose.yml` asks for; the new `YERAL_BUSINESS_IMAGE` wasn't in `.env` yet, so the command failed into
  `2>/dev/null` and the check read "Postgres isn't running". Nothing was lost (no users or businesses yet; the cities
  and categories are seeded by every deploy). A backup was taken right after
  (`/srv/yeral/backup-2026-10-25-after-07952fd.sql.gz`), and `deploy.sh` now asks Docker by the compose labels
  (`docker ps --filter label=com.docker.compose.service=postgres`), which doesn't read `compose.yml`.
- Follow-ups: a new variable in the server's `compose.yml` goes into `.env` before any `docker compose` command in
  `deploy.sh` reads the file; the deploy prints "saved the database to …" every time Postgres runs, so a deploy log
  without that line is worth a look.
