import { base } from '@yeral/config/vitest'
import { defineConfig, mergeConfig } from 'vitest/config'

// Unit tests only (tokens, helpers). Components are tested through their stories in apps/storybook.
export default mergeConfig(base, defineConfig({}))
