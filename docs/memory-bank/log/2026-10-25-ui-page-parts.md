# Slice 3's shared ui, U3b: BackLink, PageHeader, RatingDistribution, RatingInput, the Drawer's pager (feat/ui-page-parts)

- Changed (`@yeral/ui`, DS-Patterns, COMPONENTS.md rows):
  - **BackLink** (new, `back-link`, Navigation/BackLink): «‹ Specialists», 36 high, n-600 14/500, a chevron, the group
    tint and ink on hover; an `a`, or `asChild` around the router's `Link` (its words the label, the chevron before
    them).
  - **PageHeader** (new, `page-header`, Navigation/PageHeader): a composition: `title` (`level` 1 the H1 32/38 of a
    client page, 2 a drill-down's 22/28 700), `subtitle`, `back` (a BackLink), `avatar`, `actions`, `tabs` (a
    TabsList; under the business app's top bar the tabs alone).
  - **RatingDistribution** (new, `rating-distribution`, Charts/RatingDistribution): rows in the caller's order (5 → 1),
    13/18, a 6 bar filled to the row's share of all reviews, a 28 count column, each row `role="img"` with its `label`;
    `average` (the score 44/48 700, its stars, the count of reviews) above.
  - **Rating** (extended): `Stars` sizes 12 / 14 / 16; **RatingInput**: five 48 star buttons as a Radix radio group
    (arrow keys move and pick), 32 stars, n-500 outlines until picked, ink filled up to the pick or the star under the
    pointer (a preview, cleared by a pick), the word beside them (seen for the preview, said for the pick).
  - **Drawer** (extended): `DrawerHeader`'s `pager` (one request at a time): previous and next (ghost 36 chevrons named
    by the caller) around «1 / 6» (13/18 n-600) after the title.
- Stories (Russian-length words for each): BackLink Default, AsChild; PageHeader WithTabs, DrillDown, Client;
  RatingDistribution WithAverage, BarsOnly, First; Rating Sizes, Input; Drawer HeaderPager. 24 pass in Chromium (axe
  included). Arrow keys in a test are held (`{ArrowRight>}`): the radio group picks on the focus that follows the key.
- Not built (rule 10a): the Drawer's other headers (avatar with tabs, image) and footer layouts; Stars' average is
  the caller's to round.
