import { config } from '@yeral/config/eslint'

export default config({ tsconfigRootDir: import.meta.dirname, ignores: ['**/playwright-report/**', '**/test-results/**'] })
