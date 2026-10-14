import { base } from '@yeral/config/vitest'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(base, defineConfig({}))
