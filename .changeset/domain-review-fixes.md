---
'@yeral/domain': patch
---

Booking rules fixes from review: a hidden price is never added into a shown total; "open now" counts the break as closed and says when the place reopens; overlapping special days resolve the same way whatever their order (a dated one beats a yearly one, then the narrower range, then closed beats special hours); phone input with +993 or a leading 8 (also typed after +993) is read correctly while typing; staff bookings can't start before the current slot; `businessTotal()` gives the business its full sum, hidden prices included; `hasAppointmentSlot()` answers "any free time that day?" without listing every slot; a moved table booking no longer collides with its own table; long booking codes use their whole range.
