---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/i18n': minor
---

The Ýeral team's sign-in for the admin tool (book F-178, ADR 0026): its own accounts with a login, a password and an
authenticator code (or a recovery code), set up from a link the server command (`admin-invite`) or a teammate makes,
reset and turned off by one another; sessions of their own on `/v1/admin`. Migration 0035 adds `admins`,
`admin_sessions` and `admin_actions`; the server needs `ADMIN_SECRET_KEY` (deploy.sh makes it).
