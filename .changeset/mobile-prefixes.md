---
'@yeral/domain': minor
'@yeral/features': minor
'@yeral/business': patch
---

The market names what a mobile number starts with (`MARKET.phone.mobilePrefixes`, Turkmenistan `['6', '7']`), the one
source of the rule: `MARKET.phone.mobile` is built from it (`startsWithOneOf()`), so the api's `isMobile` checks the same
list the screens name. The business login's «Codes go to mobile numbers only. Enter a number starting with 6 or 7.»
reads the list instead of parsing the rule (`mobileStarts()` and the message without the digits are gone). A market
writes its phone rules through `phoneRules()`, which makes `mobile` from the prefixes.
