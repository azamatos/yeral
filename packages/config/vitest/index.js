// @ts-check

/**
 * Base Vitest options. A package merges them with its own:
 *   export default mergeConfig(base, defineConfig({ ... }))
 */
export const base = {
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
}
