# 2026-10-21 · Ýeral's support line

The owner gave Ýeral's support line until it has its own: their phone +993 64 75 45 91 and Telegram @eldzhernone
(chapter 9, 21.10.2026).

- `MARKET.support` (`@yeral/domain/market`): one place per deployment; `telegramUrl()` makes the chat link.
- The business app: Contact Ýeral in the account menu (a submenu: Call, Write on Telegram), in More on phones (its two
  rows in the sheet, with a row back), in the owner's box in My profile, and in the sign-in's "this account owns a
  business" note (the client site's too). `@yeral/ui`: `AccountMenu` rows take `links` (a submenu), `MenuSubContent`,
  `MoreSheetRow` takes a `caption`.
- The api: the example businesses show `MARKET.support.phone` unless `EXAMPLE_PHONE` is set; it's no longer required
  with `EXAMPLE_BUSINESSES`.

## For the lead to fold in

- activeContext, "Waiting on the owner": the support phone and Telegram are answered (this note); the examples can be
  switched on whenever the first launch opens.
- Cleanup the owner asked for ("delete everything unnecessary"), blocked by the session's permission check and left to
  the owner: the 42 merged branches on GitHub, the 80 local branches (their SHAs listed in the session), the unused
  Hyperdrive config `yeral-production` and the Neon project "Yeral", the untracked `.neon` and `apps/api/dist-worker/`
  in the main checkout, and the unused repo setting "Allow GitHub Actions to create and approve pull requests".
