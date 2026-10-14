// @ts-check
import { fileURLToPath } from 'node:url'

/** Formatting for the whole monorepo. @type {import('prettier').Config & { tailwindStylesheet?: string }} */
export default {
  semi: false,
  singleQuote: true,
  printWidth: 140,
  trailingComma: 'all',
  // resolved from this package, so consumers don't need the plugin installed themselves
  plugins: [new URL(import.meta.resolve('prettier-plugin-tailwindcss'))],
  // class sorting follows the design system's theme (custom colours, sizes, radii)
  tailwindStylesheet: fileURLToPath(new URL('../../ui/src/styles/tailwind.css', import.meta.url)),
}
