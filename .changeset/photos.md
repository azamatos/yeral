---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
'@yeral/sdk': minor
---

Photos (book F-084, F-101, B-12, B-37): a business's gallery (up to 20, added, removed and ordered, the first the
cover), a person's own photo and a team member's picture, each JPEG, PNG or WebP up to 10 MB by its bytes, kept
without its EXIF (GPS), XMP and comments on the server's disk behind a storage port and served at `/media/up/…`.
Uploads need a sign-in, 60 an hour per account; the team's screens show a person's own photo where the owner set
none. Migration 0032 adds `users.photo`; the api's image takes a `media` volume (`MEDIA_DIR`).
