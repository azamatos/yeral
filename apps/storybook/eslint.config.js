import { config } from '@yeral/config/eslint'

export default config({ tsconfigRootDir: import.meta.dirname, react: true, ignores: ['storybook-static/**'] })
