import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * `path` in the directory of `from` or the nearest parent that has it, as a file path; undefined when none has it.
 * Node only: the same file runs as src/entry/node.ts (tsx) and bundled as dist/node.js, at different depths.
 */
export function findUp(from: URL, path: string): string | undefined {
  for (let dir = new URL('.', from); ; dir = new URL('..', dir)) {
    const candidate = new URL(path, dir)
    if (existsSync(candidate)) return fileURLToPath(candidate)
    if (new URL('..', dir).href === dir.href) return undefined
  }
}
