@AGENTS.md

@docs/memory-bank/activeContext.md

## Claude Code specifics

Project skills in `.claude/skills` — use them when the task matches:

| Skill | When |
|---|---|
| `fsd` | creating, moving or importing code: which layer, slice, segment, package |
| `design-system` | tokens, `@yeral/ui` components, stories, visual checks against the design |
| `api-endpoint` | a screen needs data or an action the API doesn't offer; a request/response shape changes |
| `i18n` | any user-visible text, number, price, date, duration or plural |
| `testing` | choosing and writing the right test (unit, story, API, end to end) |
| `qa-flows` | click-testing flows in the browser with Claude in Chrome |
| `ship` | finishing work: checks, PR, review, merge, a deploy by hand, rollback |
| `parallel-work` | starting, running and handing off a task alongside other agents |
| `memory-bank` | end of a session, after a decision, or "remember this for the project" |

- No agents on this project (owner, 2026-11-01): only the main session works here, no subagents, no workflows. A
  `code-review` level that fans out agents counts: review the diff yourself.
- The private auto-memory holds only how to work with the owner; project facts belong in `docs/memory-bank`.
- `.claude/settings.json` enables the TypeScript LSP plugin (`typescript-lsp@claude-plugins-official`; needs
  `npm i -g typescript-language-server typescript`): ask it where a symbol is defined, who uses it and what type it has
  before grepping; it also reports type errors right after an edit.
- The owner may start `/design-sync` to sync `@yeral/ui` with a Claude Design design-system project; don't start it on your own.
