// Deploys the api Worker with the build stamp: node scripts/deploy.mjs production (no staging, ADR 0020)
import { execFileSync, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const env = process.argv[2]
if (env !== 'production') {
  console.error('usage: deploy.mjs production')
  process.exit(1)
}
// the Hyperdrive config is created by the owner's go-ahead (operations.md); never deploy against the placeholder id
if (/"id":\s*"0{32}"/.test(readFileSync('wrangler.jsonc', 'utf8'))) {
  console.error('wrangler.jsonc still has the placeholder Hyperdrive id: create the config first (operations.md)')
  process.exit(1)
}
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const commit = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const stamp = JSON.stringify({ version, commit, builtAt: new Date().toISOString() })
execFileSync('pnpm', ['exec', 'wrangler', 'deploy', '--env', env, '--define', `__BUILD__:${stamp}`], { stdio: 'inherit' })
