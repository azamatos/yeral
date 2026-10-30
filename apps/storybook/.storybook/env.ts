/**
 * The build variables the stories see (`import.meta.env`, read by Vite from `process.env` too). The ways to reach
 * Ýeral (`VITE_YERAL_SUPPORT_*`, @yeral/lib/site) are the deployment's and never in the repo, so Storybook shows
 * placeholders: a number in the market's unused range (nobody's), a Telegram name and an example.com address.
 * Imported first by `main.ts` and `vitest.config.ts`, before Vite resolves its config.
 */
process.env.VITE_YERAL_SUPPORT_PHONE ??= '+99369000000'
process.env.VITE_YERAL_SUPPORT_TELEGRAM ??= 'yeral_support'
process.env.VITE_YERAL_SUPPORT_EMAIL ??= 'hello@example.com'
