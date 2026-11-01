# Slice 7 L2: «Try the business app»

- What's there: `/try` on the business app starts the demo and goes to its calendar; links from the sign-in, Home's business block and
  the footer; the Demo banner over every page and «Log in» in place of the account menu (sidebar, rail, the phone's More). `DEMO_WORKSPACE`
  is on in both Compose files, so this PR's deploy opens the demo.
- Why `/try` is on the business app: the demo's cookie is read only for its Origin. The client site links there.
- «Create your business» logs out of the demo first: its account can't start a business, and the setup would answer «You already have a
  business».
- Left: the design's ExampleBadge beside the workspace's name (the switcher has no slot for it), the business landing page (B-Landing).
