---
'@yeral/contract': patch
'@yeral/api': patch
---

API contract fixes from review: login codes go to mobile numbers only; a service can't be listed twice in a booking; a booking start is 23:59 at the latest; a table for 9 or more people now gets `party_too_large` ("9 we ondan köp adam bolsa, jaň ediň") instead of a generic validation error; search needs both lat and lng and a map area with min ≤ max; the events cursor has a fixed format; a booking's type is `what.type` only.
