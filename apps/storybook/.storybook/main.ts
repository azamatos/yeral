import tailwindcss from '@tailwindcss/vite'
import type { StorybookConfig } from '@storybook/react-vite'
import type { Plugin } from 'vite'

/**
 * Each app imports its own `src` as `@/…` (techContext "Code conventions"). Stories from several apps share this one
 * Vite, so `@/` resolves against the app of the file that imports it.
 */
const appAlias: Plugin = {
  name: 'yeral-app-alias',
  enforce: 'pre',
  resolveId(source, importer, options) {
    if (!source.startsWith('@/') || !importer) return null
    const app = /^(.*\/apps\/[^/]+\/src)\//.exec(importer)?.[1]
    return app ? this.resolve(`${app}/${source.slice(2)}`, importer, { ...options, skipSelf: true }) : null
  },
}

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../../../packages/ui/src/**/*.stories.@(ts|tsx)', '../../business/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  core: { disableTelemetry: true },
  staticDirs: ['../public', { from: '../../../docs/design/assets/photos', to: '/photos' }],
  viteFinal: (vite) => ({ ...vite, plugins: [...(vite.plugins ?? []), appAlias, tailwindcss()] }),
}

export default config
