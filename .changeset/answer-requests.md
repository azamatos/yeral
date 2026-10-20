---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

The business answers requests (book B-19–B-21): `GET /v1/w/{slug}/requests` lists the waiting requests and moves each
person may see, most urgent first, with the client's visits and no-shows and whether they may answer;
`POST …/confirm` confirms (a move moves its booking); `POST …/decline` declines with a reason and, for a new request,
up to 3 offered times each checked free for its specialist. The client gets the declined SMS with the reason
(en/tk/ru; a client who can't book online and got no times is asked to call), and a move's decline carries its reason.
A request shared by two specialists is answered by the desk. The sdk adds `requests.list`, `confirm` and `decline`; booking events refresh the list.
