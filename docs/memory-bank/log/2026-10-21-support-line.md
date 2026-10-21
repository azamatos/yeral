# 2026-10-21 · Ýeral's support line

The owner gave Ýeral's support line until it has its own: their phone +993 64 75 45 91 and Telegram @eldzhernone
(chapter 9, 21.10.2026).

- `MARKET.support` (`@yeral/domain/market`): one place per deployment.
- `@yeral/features/contact-yeral`: `SUPPORT_LINE` (the number written as the market writes it, `tel:`, `@name`,
  `t.me`) and `supportLinks()` (Call, Write on Telegram), for every app.
- `@yeral/ui`: `LinkMenu` (a title and links with a second line from any trigger: a menu from 768, a small sheet on
  phones), `MenuLinkItem`, `MenuTitle`, `MenuSubContent`; `AccountMenu` rows are actions or a submenu of links (typed
  apart); `MoreSheetRow` takes a `caption`.
- The business app: `features/contact-yeral` (ContactMenu, Storybook Business/Shell/ContactMenu): the account menu's
  submenu, More's row (its small sheet over More), the owner's box in My profile, the sign-in's "owns a business" note
  (focus moves to it). The client site's sign-in note has the same link (`shared/ui`). The Hidden by Ýeral banner,
  closing a workspace and the category picker's no-match (B-Shell, B-Settings) will use the same `ContactYeral`.
- The api: the example businesses show `MARKET.support.phone` unless `EXAMPLE_PHONE` is set (no longer required with
  `EXAMPLE_BUSINESSES`); `setup` logs the phone they show.

## For the lead to fold in

- activeContext, "Waiting on the owner": the support phone and Telegram are answered (this note); the examples can be
  switched on whenever the first launch opens.
- Cleanup the owner asked for ("delete everything unnecessary"), blocked by the session's permission check and left to
  the owner: the 42 merged branches on GitHub, the 80 local branches (their SHAs listed in the session), the unused
  Hyperdrive config `yeral-production` and the Neon project "Yeral", the untracked `.neon` and `apps/api/dist-worker/`
  in the main checkout, and the unused repo setting "Allow GitHub Actions to create and approve pull requests".
