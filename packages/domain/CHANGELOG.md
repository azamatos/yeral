# @yeral/domain

## 0.1.0

### Minor Changes

- [#13](https://github.com/azamatos/yeral/pull/13) [`bc26121`](https://github.com/azamatos/yeral/commit/bc26121f71c0cfcadce5e511f4bcc74f96e47502) Thanks [@azamatos](https://github.com/azamatos)! - First version of the booking rules for every kind of business: business-local time, +993 phones, booking codes, booking rules with their options, opening hours with special days and staff shifts, free times for appointments (service chains, any specialist, buffers), tables and classes, the five-status lifecycle with hold times, workspace permissions, client stats and distances.

### Patch Changes

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - Booking rules fixes from review: a hidden price is never added into a shown total; "open now" counts the break as closed and says when the place reopens; overlapping special days resolve the same way whatever their order (a dated one beats a yearly one, then the narrower range, then closed beats special hours); phone input with +993 or a leading 8 (also typed after +993) is read correctly while typing; staff bookings can't start before the current slot; `businessTotal()` gives the business its full sum, hidden prices included; `hasAppointmentSlot()` answers "any free time that day?" without listing every slot; a moved table booking no longer collides with its own table; long booking codes use their whole range.
