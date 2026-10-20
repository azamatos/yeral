---
'@yeral/sdk': patch
'@yeral/business': patch
---

Nothing of the last person shows after a sign-in, a log-out, a sign-in as someone else or a session that ended on its
own: the sdk empties their workspaces, invites, team, calendar, clients, bookings and favourites, and what they saw as
a team member, by itself (any 401 counts). Leaving a workspace forgets it; a phone change refreshes the invites.
