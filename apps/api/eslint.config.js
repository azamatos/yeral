import { config } from '@yeral/config/eslint'

export default [
  // wrangler's dry-run bundle
  { ignores: ['dist-worker/**'] },
  ...config({ tsconfigRootDir: import.meta.dirname }),
  {
    // API tests read response JSON loosely; the contract schemas type the real clients
    files: ['**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]
