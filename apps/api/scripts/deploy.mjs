// Deploys the api Worker with the build stamp: node scripts/deploy.mjs production (no staging, ADR 0020)
import { execFileSync, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const env = process.argv[2]
if (env !== 'production') {
  console.error('usage: deploy.mjs production')
  process.exit(1)
}
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const commit = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const stamp = JSON.stringify({ version, commit, builtAt: new Date().toISOString() })
execFileSync('pnpm', ['exec', 'wrangler', 'deploy', '--env', env, '--define', `__BUILD__:${stamp}`], { stdio: 'inherit' })
