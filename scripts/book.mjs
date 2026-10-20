#!/usr/bin/env node
// Looks the docs up by stable ID, so an agent reads one entry instead of a whole chapter.
// IDs: Q-107 (question), F-012 (feature row), B-05 / C-12 / S-03 (flow), ADR 0021.
// Usage: pnpm book show <ID>   the entry itself, with its file and lines
//        pnpm book refs <ID>   every other line that mentions it, with the section it sits in
//        pnpm book toc <doc>   headings with line ranges (07b, questions, design/README, COMPONENTS)
//        pnpm book open        questions not decided yet, and answers Claude has a concern about
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const DIRS = ['docs/product', 'docs/decisions', 'docs/design', 'docs/memory-bank']
const ID = String.raw`(?:[A-Za-z]{1,2}-\d{2,4}[a-z]?|ADR ?\d{4})`
// The book's own files define its IDs; the README, prompts and other docs only quote them.
const PRIMARY = /^docs\/product\/(\d\d[a-z]?-[^/]+|questions)\.md$/

const docs = DIRS.flatMap((dir) => {
  let names = []
  try {
    names = readdirSync(join(root, dir), { recursive: true })
  } catch {
    return []
  }
  return names
    .map((name) => `${dir}/${name.split(sep).join('/')}`)
    .filter((file) => file.endsWith('.md') && !/node_modules|\/dist\//.test(file))
    .sort()
    .map((file) => ({ file, lines: readFileSync(join(root, file), 'utf8').split('\n') }))
})

// A section runs from its heading to the next heading of the same or a higher level. Lines inside ``` fences are
// examples, not headings.
function sections(doc) {
  const heads = []
  let fenced = false
  doc.lines.forEach((line, i) => {
    if (line.startsWith('```')) fenced = !fenced
    const m = !fenced && /^(#{1,4}) (.*)/.exec(line)
    if (m) heads.push({ level: m[1].length, title: m[2], start: i })
  })
  return heads.map((h, k) => {
    const next = heads.slice(k + 1).find((x) => x.level <= h.level)
    return { ...h, end: next ? next.start : doc.lines.length }
  })
}

const isId = (s) => new RegExp(`^${ID}$`, 'i').test(s)
// Q-107a → Q-107a, q-107 → Q-107, adr0021 → ADR 0021
const normalize = (id) =>
  id
    .trim()
    .replace(/^adr ?/i, 'ADR ')
    .replace(/^[a-z]{1,2}-/i, (prefix) => prefix.toUpperCase())
const leadingId = (title) => {
  const m = new RegExp(`^(${ID})\\b`).exec(title)
  return m ? normalize(m[1]) : null
}

function findEntry(id) {
  if (id.startsWith('ADR ')) {
    const doc = docs.find((d) => d.file.startsWith(`docs/decisions/${id.slice(4)}-`))
    return doc ? { file: doc.file, start: 0, end: doc.lines.length } : null
  }
  const ordered = [...docs.filter((d) => PRIMARY.test(d.file)), ...docs.filter((d) => !PRIMARY.test(d.file))]
  for (const doc of ordered) {
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
const usage = 'usage: pnpm book show <ID> | refs <ID> | toc <doc> | open   (ID: Q-107, F-012, B-05, ADR 0021)'

const [command, ...rest] = process.argv.slice(2)
const arg = rest.join(' ').trim()

if (command === 'show' || command === 'refs') {
  if (!isId(arg)) fail(`${arg || '(no ID)'}: not an ID\n${usage}`)
  const id = normalize(arg)
  const entry = findEntry(id)
  if (command === 'show') {
    if (!entry) fail(`${id}: no question, feature, flow or ADR with this ID`)
    const doc = docs.find((d) => d.file === entry.file)
    console.log(`${entry.file}:${entry.start + 1}-${entry.end}`)
    console.log(doc.lines.slice(entry.start, entry.end).join('\n').trimEnd())
  } else {
    // ADRs are also linked by number: [0021](../decisions/0021-product-book-first.md)
    const n = id.slice(4)
    const mention = id.startsWith('ADR ') ? new RegExp(`\\bADR ?${n}\\b|\\[${n}\\]|decisions/${n}-`) : new RegExp(`\\b${id}\\b`)
    let found = 0
    for (const doc of docs) {
      const heads = sections(doc).reverse()
      doc.lines.forEach((line, i) => {
        if (!mention.test(line)) return
        if (entry && doc.file === entry.file && i >= entry.start && i < entry.end) return
        const section = heads.find((s) => s.start <= i)
        const where = section ? (leadingId(section.title) ?? section.title.slice(0, 40)) : ''
        console.log(`${doc.file}:${i + 1} [${where}] ${line.trim().slice(0, 160)}`)
        found++
      })
    }
    if (!entry && !found) fail(`${id}: no question, feature, flow or ADR with this ID, and no mentions`)
    if (!found) console.error(`${id}: defined in ${entry.file}:${entry.start + 1}, mentioned nowhere else`)
  }
} else if (command === 'toc') {
  const doc = arg && (docs.find((d) => basename(d.file).startsWith(arg)) ?? docs.find((d) => d.file.includes(arg)))
  if (!doc) fail(`${arg || '(no doc)'}: no doc matches; try 07b, questions, design/README or COMPONENTS`)
  console.log(doc.file)
  for (const s of sections(doc)) {
    const range = `${s.start + 1}-${s.end}`.padEnd(11)
    console.log(`${range} ${'  '.repeat(Math.max(0, s.level - 2))}${s.title.slice(0, 100)}`)
  }
} else if (command === 'open') {
  const doc = docs.find((d) => d.file === 'docs/product/questions.md')
  if (!doc) fail('docs/product/questions.md: not found')
  for (const s of sections(doc)) {
    if (!leadingId(s.title)) continue
    const body = doc.lines.slice(s.start, s.end).join('\n')
    const meta = /^chapter:.*$/m.exec(body)?.[0] ?? ''
    if (!/status: decided/.test(meta) || /^concern:/m.test(body)) console.log(`${s.title} — ${meta || 'no status line'}`)
  }
} else {
  fail(usage)
}
