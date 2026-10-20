# Docs lookup and TypeScript LSP for agents (chore/book-lookup)

- Changed: `scripts/book.mjs` (`pnpm book`) looks the docs up by stable ID instead of reading a chapter whole:
  `show Q-107` prints one question, feature row (`F-012`), flow (`B-05`) or ADR with its file and lines; `refs` lists
  every other mention with its section; `toc 07b` outlines a doc with line ranges; `open` lists questions not decided
  or with a concern. It parses `docs/product`, `docs/decisions`, `docs/design` and `docs/memory-bank` on each call (no
  index to keep fresh). `AGENTS.md` (Read first, Commands) points agents to it.
- Changed: `.claude/settings.json` enables the TypeScript LSP plugin for Claude Code (`CLAUDE.md` says how to use it).
- Why: in 100 past Claude Code session transcripts about a quarter of all tool output was product-book and design
  docs read whole or paged with `sed`/`cat` (`questions.md` alone ~290k tokens); one entry is 0.2–2k characters
  against 60–150k for its chapter.
- Follow-ups: none.
