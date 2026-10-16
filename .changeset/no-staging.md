---
'@yeral/lib': minor
'@yeral/api': patch
---

Local and production only: the site configuration no longer has a `staging` environment, the api's Worker is configured for production only (`api.yeral.app`, first deployed with the new client site), and the demo seed never goes into a remote database.
