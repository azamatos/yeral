---
'@yeral/business': minor
'@yeral/ui': minor
---

Signing in to the business app (`/login`, B-Login): the phone number and the 4-digit code in the shared sign-in step,
with the code shown on the screen when the api hands it out (the first launch, no SMS), a wrong code with the tries
left, the 60-second lock and a new code after it, "Get a new code" after 0:59, too many codes in an hour (the wait in
minutes), a landline or a short number refused before a code is asked for. Then "Is this you?" for an account unused
for 6 months, the name for someone without one (first name required, surname optional), and where the person goes:
an invite to accept or decline, the workspace they used last ("Opening Glow Studio…"), an expired invite, or "You
don't have a workspace yet". `/` leads to the sign-in; the calendar and the setup wizard are stand-ins until their
slices. `@yeral/ui` adds `AuthCard` (Display/AuthCard): the sign-in page's layout with header, a centred card (title,
lead, the step) and a footer link, frameless on phones; the title takes the focus when the step changes.
