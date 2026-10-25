# Slice 3's shared ui, U3b: BackLink, PageHeader, RatingDistribution, RatingInput, the Drawer's pager (feat/ui-page-parts)

- Changed (`@yeral/ui`, DS-Patterns, COMPONENTS.md rows):
  - **BackLink** (new, `back-link`, Navigation/BackLink): «‹ Specialists», 36 high, n-600 14/500, a chevron, the group
    tint and ink on hover; an `a`, or `asChild` around the router's `Link` (its words the label, the chevron before
    them).
  - **PageHeader** (new, `page-header`, Navigation/PageHeader): a composition: `title` (`level` 1 the H1 32/38 of a
    client page, 2 a drill-down's 22/28 700), `subtitle`, `back` (a BackLink), `avatar`, `actions`, `tabs` (a
    TabsList; under the business app's top bar the tabs alone). The action sits at the right and wraps onto its own
    line when the title needs the room; no empty heading without a title.
  - **RatingDistribution** (new, `rating-distribution`, Charts/RatingDistribution): rows in the caller's order (5 → 1),
    13/18, a 6 bar filled to the row's share of all reviews (clamped), a 28 count column, each row `role="img"` with
    its `label`; `average` (the score on the h1 token, its stars, the count of reviews) above. Its bars are its own
    spans, not `ProgressBar`: one `role="img"` per row names the whole row, and a progressbar inside it would be said
    twice.
  - **Rating** (extended): `Stars` sizes 12 / 14 / 16; **RatingInput**: five 48 star buttons as a Radix radio group
    (arrow keys move and pick, no wrap from 5 to 1), 32 sharp stars (the same polygon as `Stars`, stroke 1.75), n-500
    outlines until picked, ink filled up to the pick or the star under the pointer (a preview, cleared by a pick), the
    word beside them (seen for the preview, said for the pick).
  - **Drawer** (extended): `DrawerHeader`'s `pager` (one request at a time): previous and next (the date strip's
    `PagerButton`, named by the caller) around «1 / 6» (13/18 n-600), 14 after the title. The ends are off as
    `aria-disabled` (a press does nothing), so the button pressed to reach the last item keeps the focus;
    `PagerButton` gained the `aria-disabled` look.
- Stories (Russian-length words for each): BackLink Default, AsChild; PageHeader WithTabs, DrillDown, Client;
  RatingDistribution WithAverage, BarsOnly, First; Rating Sizes, Input (the end stays at 5); Drawer HeaderPager (to the
  last with Enter, the focus stays). 26 pass in Chromium with the date strip's (axe included). Arrow keys in a test are
  held (`{ArrowRight>}`): the radio group picks on the focus that follows the key.
- Review (one round): the 10 findings fixed (the pager's focus, its button and spacing, the radio group's loop, the
  star's shape, PageHeader's wrap and empty heading, the score's token, the bar's clamp).
- Not built (rule 10a): the Drawer's other headers (avatar with tabs, image) and footer layouts; Stars' average is
  the caller's to round.
