# The client site's login, P4 slice 1 (feat/p4-client-login)

- Changed: book C-19 (log in from the header) with C-18's steps (the booking part comes with slice 3); Auth board;
  DS-Patterns v0.6 SignInCodeStep.
- `features/log-in` (`LoginModal`): Modal s 400 (pad 28, 20 apart; a bottom sheet under 768) with the brand icon and
  the close button on top (Auth `.mtop`), then the step: the phone and the code in `SignInCodeStep` (boxes 48, M
  buttons; the code on screen from `POST /v1/auth/code`'s `code`), "Is this you?" (202 from `/auth/verify`; built as
  the business app did, not reached while the code is on screen), the name for a new account (first name required,
  surname optional; `PATCH /v1/me`). The sign-in itself is `@yeral/features/auth-by-phone`'s `useSignIn` (#108).
- The header's «Log in» is a link to `/{lang}/login`; with JavaScript it opens the modal over the page instead. When
  the modal closes the focus goes back to «Log in», or to the avatar that replaced it once someone signed in.
- `/{lang}/login` (`ssr: false`, noindex): the modal over the site's chrome; signed in, back to `?redirect=` (only an
  address of this site in this language, never `/login` again: `returnTo()`, unit-tested) or Home; closed without
  logging in, Home (the page that asked would only send them back); someone already signed in with a name goes
  straight on.
- `@yeral/ui` Modal: `ModalHeader` takes `media` (the icon on the top row with the close button, the title and lead
  under it), with Login stories (400, phone sheet, Russian length).
- Decisions ("how", for the book's chapter 9):
  - DS-Patterns v0.6 wins over Auth (v0.5) for the code step: boxes 48 and M buttons (Auth drew L), «Confirm» stays
    (Q-157), «Change number» in the lead instead of Auth's back arrow beside the title (one way back, not two).
  - The terms line under «Send code» and the language row wait: the legal pages come with slice 7, and the first
    launch has one language.
  - Closing the modal at the name step leaves the person signed in without a name (a booking asks again, C-18).
  - The modal opens with the focus in the number (Auth's caption); each step puts the focus where it starts.
- Tests: stories `Client/Features/LogIn` (11: number checks and Esc back to «Log in», returning person with a wrong
  code and the avatar focused, new person and the name, change number, the lock and a new code, too many codes, no
  code on screen, "Is this you?" yes and no, offline, phone sheet) and `Client/Pages/Login` (3: back where asked,
  closed, a foreign redirect refused); unit `returnTo()`. End to end against the local api
  (`SIGN_IN_CODE_ON_SCREEN=true`): a new number → name → avatar focused; a landline refused; a demo client from
  `/en/login?redirect=…` straight back there.
- Review of PR 2 (#114), fixed: "Is this you?" answered clears the step and the code step's clocks; `returnTo()` checks
  the login after resolving the address (`/en/./login`, `%2e`); a `redirect` that isn't text is ignored, not an
  error; a modified click on «Log in» (new tab) isn't taken over, and its address carries `?redirect=` back to the page;
  no preload for it; the modal's code loads on the first opening (`lazy`); after a sign-in the page's routes reload;
  signed in while the focus was lost with «Log in», the avatar gets it; the story fake answers 404, not 401, to
  routes it doesn't know; `textLink` moved to `@yeral/ui/text-link` (the business app passes it on);
  `useRequestLanguage()` joined `@yeral/features/auth-by-phone` (the identity step's `lang`).
