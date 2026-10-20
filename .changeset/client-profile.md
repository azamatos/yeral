---
'@yeral/client': minor
'@yeral/ui': minor
'@yeral/features': minor
---

The client's profile (book C-43, C-44, C-46, C-47): `/{lang}/account/profile` behind a sign-in, with the account aside
(the person, Profile and settings, Log out). The name businesses see is edited with a save bar; the phone shows, and
«Change» (a new number and its SMS code) appears only when the account may change it (`canChangePhone`, false while
the sign-in code shows on the screen); Log out and Delete account (a modal that says what goes; owners of a business
are told why they can't). The header's menu gains «Profile». `@yeral/ui` adds `SaveBar` (Overlays/SaveBar);
`@yeral/features/auth-by-phone` adds `useCodeSteps` (the code steps over any pair of requests; `useSignIn` uses it).
