// @ts-check
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/storybook-static/**',
  '**/.wrangler/**',
  '**/routeTree.gen.ts',
]

/**
 * Shared ESLint flat config for packages and apps (not apps/legacy, which keeps eslint-config-next).
 *
 *   // eslint.config.js
 *   import { config } from '@yeral/config/eslint'
 *   export default config({ tsconfigRootDir: import.meta.dirname, react: true })
 *
 * @param {{ tsconfigRootDir: string, react?: boolean, ignores?: string[] }} options
 */
export function config({ tsconfigRootDir, react = false, ignores = [] }) {
  return defineConfig(
    { ignores: [...IGNORES, ...ignores] },
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
        globals: { ...globals.es2023, ...(react ? globals.browser : globals.node) },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
        eqeqeq: ['error', 'smart'],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    // plain JS files (configs, scripts) aren't part of a tsconfig: lint them without type information
    { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
    react ? [reactHooks.configs.flat.recommended] : [],
  )
}
