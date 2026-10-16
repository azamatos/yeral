---
'@yeral/domain': patch
---

Booking rules fixes from review: a hidden price is never added into a shown total; "open now" counts the break as closed and says when the place reopens; overlapping special days resolve the same way whatever their order (a dated one beats a yearly one, closed beats special hours); phone input with +993 or a leading 8 is read correctly while typing; staff bookings can't be placed in the past; a moved table booking no longer collides with its own table; long booking codes use their whole range.
