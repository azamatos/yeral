---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/i18n': minor
---

No average bill (book Q-103): business cards and pages no longer carry `avgBill`, and a hidden price reads "Price at
the place" (`fmt.price`; Turkmen "Baha ýerinde aýdylýar", Russian "Цена на месте"). A price limit keeps only places
with a known price inside it; sorting by price puts the rest last; ties keep a fixed order.
