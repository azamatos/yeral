# @yeral/lib

## 0.2.0

### Minor Changes

- [#25](https://github.com/azamatos/yeral/pull/25) [`a151384`](https://github.com/azamatos/yeral/commit/a1513849a033a81502c95f8c8993579d57bb2f60) Thanks [@azamatos](https://github.com/azamatos)! - Local and production only: the site configuration no longer has a `staging` environment, the api's Worker is configured for production only (`api.yeral.app`, first deployed with the new client site), and the demo seed never goes into a remote database.

## 0.1.0

### Minor Changes

- [#14](https://github.com/azamatos/yeral/pull/14) [`6e750bc`](https://github.com/azamatos/yeral/commit/6e750bcd65f5498a2522541142596f99dc3ad34b) Thanks [@azamatos](https://github.com/azamatos)! - Site configuration for every environment (local, docker, staging, production: hosts, cookie domain and prefix, allowed origins, demo flag) and start-up checks for environment variables.

### Patch Changes

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - Site configuration: an empty environment variable falls back to its default, a bad one is named as it's spelled (`VITE_YERAL_ENV`), and the docker hosts work for any domain ending.
