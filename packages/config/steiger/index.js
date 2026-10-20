// @ts-check
import plugin from '@feature-sliced/steiger-plugin'

/**
 * Feature-Sliced Design rules for an app's `src` (ADR 0004, `pnpm lint:fsd`): the plugin's recommended set, which
 * includes `fsd/forbidden-imports` (a layer imports only from layers below it, slices never from each other).
 *
 *   // steiger.config.js
 *   export { fsd as default } from '@yeral/config/steiger'
 */
export const fsd = [
  ...plugin.configs.recommended,
  {
    ignores: [
      // TanStack Router writes the route tree; routes are thin files in app/routes (systemPatterns "Routes stay thin")
      '**/routeTree.gen.ts',
      // tests and stories sit next to the code they check and aren't part of any public API
      '**/*.test.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
    ],
  },
]
