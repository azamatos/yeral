#!/usr/bin/env node
// Writes <dir>/version.json = { app, version, commit, builtAt } so every deployed app can say what it runs.
// Usage: node scripts/version-stamp.mjs <app> <dir>   (run from the app's folder)
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [app, dir] = process.argv.slice(2)
if (!app || !dir) {
  console.error('usage: version-stamp.mjs <app> <dir>')
  process.exit(1)
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
let commit = process.env.GITHUB_SHA ?? ''
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    commit = 'unknown'
  }
}

mkdirSync(dir, { recursive: true })
const stamp = { app, version, commit, builtAt: new Date().toISOString() }
writeFileSync(join(dir, 'version.json'), JSON.stringify(stamp, null, 2) + '\n')
console.log(`version.json → ${JSON.stringify(stamp)}`)
