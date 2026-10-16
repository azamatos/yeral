---
'@yeral/lib': minor
'@yeral/api': patch
---

Local and production only: the site configuration no longer has a `staging` environment, the api's Worker deploys to production (`api.yeral.app`) with `deploy:production`, and the demo seed runs only on local and Docker databases.
