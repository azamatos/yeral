#!/usr/bin/env node
// Looks the docs up by stable ID, so an agent reads one entry instead of a whole chapter.
// IDs: Q-107 (question), F-012 (feature row), B-05 / C-12 / S-03 (flow), ADR 0021.
// Usage: pnpm book show <ID>   the entry itself, with its file and lines
//        pnpm book refs <ID>   every other line that mentions it, with the section it sits in
//        pnpm book toc <doc>   headings with line ranges (07b, questions, design/README, COMPONENTS)
//        pnpm book open        questions not decided yet, and answers Claude has a concern about
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const DIRS = ['docs/product', 'docs/decisions', 'docs/design', 'docs/memory-bank']
const ID = String.raw`(?:[A-Z]{1,2}-\d{2,4}[a-z]?|ADR ?\d{4})`

const docs = DIRS.flatMap((dir) => {
  let names = []
  try {
    names = readdirSync(join(root, dir), { recursive: true })
  } catch {
    return []
  }
  return names
    .filter((name) => name.endsWith('.md') && !/node_modules|dist\//.test(name))
    .sort()
    .map((name) => {
      const file = join(dir, name)
      return { file, lines: readFileSync(join(root, file), 'utf8').split('\n') }
    })
})

// A section runs from its heading to the next heading of the same or a higher level.
function sections(doc) {
  const heads = []
  doc.lines.forEach((line, i) => {
    const m = /^(#{1,4}) (.*)/.exec(line)
    if (m) heads.push({ level: m[1].length, title: m[2], start: i })
  })
  return heads.map((h, k) => {
    const next = heads.slice(k + 1).find((x) => x.level <= h.level)
    return { ...h, end: next ? next.start : doc.lines.length }
  })
}

const normalize = (id) => id.toUpperCase().replace(/^ADR ?/, 'ADR ')
const leadingId = (title) => {
  const m = new RegExp(`^(${ID})\\b`).exec(title)
  return m ? normalize(m[1]) : null
}

function findEntry(id) {
  if (id.startsWith('ADR ')) {
    const doc = docs.find((d) => d.file.startsWith(join('docs/decisions', id.slice(4))))
    if (doc) return { file: doc.file, start: 0, end: doc.lines.length }
  }
  for (const doc of docs) {
    const section = sections(doc).find((s) => leadingId(s.title) === id)
    if (section) return { file: doc.file, start: section.start, end: section.end }
    const row = doc.lines.findIndex((line) => line.startsWith(`| ${id} |`))
    if (row >= 0) return { file: doc.file, start: row, end: row + 1 }
  }
  return null
}

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const [command, ...rest] = process.argv.slice(2)
const arg = rest.join(' ')

if (command === 'show') {
  const id = normalize(arg)
  const entry = findEntry(id)
  if (!entry) fail(`${id}: no question, feature, flow or ADR with this ID`)
  const doc = docs.find((d) => d.file === entry.file)
  console.log(`${entry.file}:${entry.start + 1}-${entry.end}`)
  console.log(doc.lines.slice(entry.start, entry.end).join('\n').trimEnd())
} else if (command === 'refs') {
  const id = normalize(arg)
  const entry = findEntry(id)
  // ADRs are also linked by number: [0021](../decisions/0021-product-book-first.md)
  const n = id.slice(4)
  const mention = id.startsWith('ADR ') ? new RegExp(`\\bADR ?${n}\\b|\\[${n}\\]|decisions/${n}-`) : new RegExp(`\\b${id}\\b`)
  for (const doc of docs) {
    const heads = sections(doc).reverse()
    doc.lines.forEach((line, i) => {
      if (!mention.test(line)) return
      if (entry && doc.file === entry.file && i >= entry.start && i < entry.end) return
      const section = heads.find((s) => s.start <= i)
      const where = section ? (leadingId(section.title) ?? section.title.slice(0, 40)) : ''
      console.log(`${doc.file}:${i + 1} [${where}] ${line.trim().slice(0, 160)}`)
    })
  }
} else if (command === 'toc') {
  const doc = docs.find((d) => basename(d.file).startsWith(arg)) ?? docs.find((d) => d.file.includes(arg))
  if (!arg || !doc) fail(`${arg}: no doc matches; try 07b, questions, design/README or COMPONENTS`)
  console.log(doc.file)
  for (const s of sections(doc)) {
    const range = `${s.start + 1}-${s.end}`.padEnd(11)
    console.log(`${range} ${'  '.repeat(Math.max(0, s.level - 2))}${s.title.slice(0, 100)}`)
  }
} else if (command === 'open') {
  const doc = docs.find((d) => d.file === 'docs/product/questions.md')
  for (const s of sections(doc)) {
    if (!leadingId(s.title)) continue
    const body = doc.lines.slice(s.start, s.end).join('\n')
    const meta = doc.lines[s.start + 1] ?? ''
    if (!/status: decided/.test(meta) || /^concern:/m.test(body)) console.log(`${s.title} — ${meta}`)
  }
} else {
  fail('usage: pnpm book show <ID> | refs <ID> | toc <doc> | open')
}
