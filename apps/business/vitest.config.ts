import { base } from '@yeral/config/vitest'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'

// Unit tests for the app's logic (node). Its screens are tested through their stories, which apps/storybook runs.
export default mergeConfig(
  base,
  defineConfig({
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  }),
)
