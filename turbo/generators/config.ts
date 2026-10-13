import type { PlopTypes } from '@turbo/gen'

/**
 * `pnpm gen <generator>` scaffolds code in the shape every agent is expected to produce.
 * Planned: `ui-component` (M1, design system), `slice` (M3, FSD slice), `endpoint` (M2, api module).
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('package', {
    description: 'Internal workspace package in packages/<name> (TypeScript source, lint, typecheck, tests)',
    prompts: [
      { type: 'input', name: 'name', message: 'Package name without scope (kebab-case, e.g. "domain"):' },
      { type: 'input', name: 'description', message: 'One line: what is it for?' },
    ],
    actions: [
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ dashCase name }}/package.json',
        templateFile: 'templates/package/package.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ dashCase name }}/tsconfig.json',
        templateFile: 'templates/package/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ dashCase name }}/eslint.config.js',
        templateFile: 'templates/package/eslint.config.js.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ dashCase name }}/vitest.config.ts',
        templateFile: 'templates/package/vitest.config.ts.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ dashCase name }}/src/index.ts',
        templateFile: 'templates/package/index.ts.hbs',
      },
      () => 'Next: pnpm install, then add the package to "Where shared things live" in docs/memory-bank/techContext.md',
    ],
  })
}
