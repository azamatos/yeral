---
'@yeral/client': minor
'@yeral/ui': patch
---

Log in on the client site (book C-19): «Log in» in the header opens a 400 modal (a bottom sheet on phones) over the
page with the phone and the code (the code shows on the screen at the first launch), "Is this you?" for an account
unused for 6 months, and the name for a new account; then the header shows the avatar, which gets the focus.
`/{lang}/login` opens the same modal and goes back to `?redirect=` (this site only) once signed in. `@yeral/ui`'s
`ModalHeader` takes `media` (the login's brand icon above the title).
