import type { Linter } from 'eslint'

/** Shared ESLint flat config for packages and apps. */
export declare function config(options: { tsconfigRootDir: string; react?: boolean; ignores?: string[] }): Linter.Config[]
