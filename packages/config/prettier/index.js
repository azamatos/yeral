// @ts-check

/** Formatting for the whole monorepo. @type {import('prettier').Config} */
export default {
  semi: false,
  singleQuote: true,
  printWidth: 140,
  trailingComma: 'all',
  // resolved from this package, so consumers don't need the plugin installed themselves
  plugins: [new URL(import.meta.resolve('prettier-plugin-tailwindcss'))],
}
