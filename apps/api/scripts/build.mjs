// Bundles the Node entry into dist/node.js (one file, for the Docker image) and copies the SQL migrations next to it.
import { execSync } from 'node:child_process'
import { cpSync, readFileSync, rmSync } from 'node:fs'
import { build } from 'esbuild'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
let commit = process.env.GITHUB_SHA ?? ''
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    commit = 'unknown'
  }
}

rmSync('dist', { recursive: true, force: true })
await build({
  entryPoints: ['src/entry/node.ts', 'src/db/cli.ts'],
  outdir: 'dist',
  entryNames: '[name]',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  // pg's optional native binding is never used
  external: ['pg-native'],
  define: { __BUILD__: JSON.stringify({ version, commit, builtAt: new Date().toISOString() }) },
  // CommonJS dependencies (pg) call require() inside the ESM bundle
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  logLevel: 'warning',
})
cpSync('src/db/migrations', 'dist/migrations', { recursive: true })
console.warn(`api ${version} (${commit.slice(0, 7)}) → dist/node.js, dist/cli.js, dist/migrations`)
