// Builds the product book page (one HTML file) from the Markdown chapters in docs/product.
// Usage: node docs/product/tools/build.mjs  →  docs/product/tools/dist/product-book.html
// The page is published as a claude.ai artifact; see docs/product/README.md.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const bookDir = join(here, '..')
const outFile = join(here, 'dist', 'product-book.html')

// ---------- helpers ----------

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const translit = { ä: 'a', ç: 'c', ž: 'z', ň: 'n', ö: 'o', ş: 's', ü: 'u', ý: 'y', é: 'e' }
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[äçžňöşüýé]/g, (c) => translit[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

const qAnchor = (id) => id.toLowerCase() // Q-001 → q-001
const fAnchor = (id) => id.toLowerCase() // F-001 → f-001

function inline(text) {
  const codes = []
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c)
    return `\u0000${codes.length - 1}\u0000`
  })
  s = escapeHtml(s)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:/.test(href)
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`)
  return s
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))

// ---------- questions ----------

function parseQuestions(md) {
  const questions = []
  const blocks = md.split(/^## (?=Q-\d+)/m).slice(1)
  for (const block of blocks) {
    const lines = block.split('\n')
    const head = lines[0].match(/^(Q-\d+)\s*·\s*(.+)$/)
    if (!head) continue
    const q = {
      id: head[1],
      title: head[2].trim(),
      chapter: '',
      status: 'open',
      options: [],
      answer: '',
      context: [],
    }
    for (const line of lines.slice(1)) {
      const meta = line.match(/^chapter:\s*(\w+)\s*·\s*status:\s*(\w+)(?:\s*·\s*priority:\s*(\w+))?/)
      const opt = line.match(/^- ([A-Z]) · (.+)$/)
      const ans = line.match(/^answer:\s*(.*)$/)
      if (meta) {
        q.chapter = meta[1]
        q.status = meta[2]
        q.start = meta[3] === 'high'
      } else if (opt) {
        const rec = /\(recommended\)\s*$/.test(opt[2])
        q.options.push({ key: opt[1], text: opt[2].replace(/\s*\(recommended\)\s*$/, ''), rec })
      } else if (ans) {
        q.answer = ans[1].trim() === '—' ? '' : ans[1].trim()
      } else {
        q.context.push(line)
      }
    }
    q.contextHtml = renderBlocks(q.context.join('\n').trim(), 'q')
    questions.push(q)
  }
  return questions
}

function questionCard(q) {
  const decided = q.status === 'decided'
  const options = q.options
    .map(
      (o) => `
      <button type="button" class="opt" data-qid="${q.id}" data-key="${o.key}"${decided ? ' disabled' : ''}>
        <span class="opt-key">${o.key}</span>
        <span class="opt-text">${inline(o.text)}</span>
        ${o.rec ? '<span class="rec">Recommended</span>' : ''}
      </button>`,
    )
    .join('')
  return `
  <article class="q${decided ? ' is-decided' : ''}" id="${qAnchor(q.id)}" data-qid="${q.id}">
    <header class="q-head">
      <span class="q-id">${q.id}</span>
      <h4 class="q-title">${inline(q.title)}</h4>
      ${q.start ? '<span class="q-start">Start here</span>' : ''}
      <span class="q-state" data-state-for="${q.id}">${decided ? 'Decided' : 'Open'}</span>
    </header>
    <div class="q-context">${q.contextHtml}</div>
    <div class="opts" role="group" aria-label="Options for ${q.id}">${options}</div>
    ${
      decided
        ? `<p class="q-recorded"><strong>Decided:</strong> ${inline(q.answer)}</p>`
        : `<div class="q-note">
      <label for="note-${q.id}">Your note (optional)</label>
      <textarea id="note-${q.id}" data-note-for="${q.id}" rows="2" maxlength="2000" placeholder="Anything to add, or your own option"></textarea>
      <div class="q-actions">
        <button type="button" class="btn-quiet" data-save-note="${q.id}">Save note</button>
        <button type="button" class="btn-quiet" data-clear="${q.id}">Clear answer</button>
        <span class="q-saved" data-saved-for="${q.id}" aria-live="polite"></span>
      </div>
    </div>`
    }
  </article>`
}

// ---------- markdown blocks ----------

let questionsById = new Map()
const placedQuestions = new Set()
let headingIds = new Set()
let chapterKey = ''
const commentable = (tag) => tag === 'h2' || tag === 'h3'

function headingId(text) {
  let id = `${chapterKey}-${slugify(text) || 'section'}`
  let n = 2
  while (headingIds.has(id)) id = `${chapterKey}-${slugify(text)}-${n++}`
  headingIds.add(id)
  return id
}

function renderList(lines, start) {
  // returns [html, nextIndex]
  const ordered = /^\s*\d+\.\s/.test(lines[start])
  const baseIndent = lines[start].match(/^\s*/)[0].length
  const items = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      // a blank line ends the list unless the next line continues it at the same depth
      const next = lines[i + 1]
      if (next && next.match(/^\s*/)[0].length >= baseIndent && /^\s*(-|\d+\.)\s/.test(next)) {
        i++
        continue
      }
      break
    }
    const indent = line.match(/^\s*/)[0].length
    const marker = line.match(/^\s*(-|\d+\.)\s+(.*)$/)
    if (indent === baseIndent && marker) {
      items.push({ text: marker[2], children: [] })
      i++
    } else if (indent > baseIndent && marker && items.length) {
      const [html, next] = renderList(lines, i)
      items[items.length - 1].children.push(html)
      i = next
    } else if (indent > baseIndent && items.length) {
      items[items.length - 1].text += ' ' + line.trim()
      i++
    } else {
      break
    }
  }
  const tag = ordered ? 'ol' : 'ul'
  const body = items.map((it) => `<li>${inline(it.text)}${it.children.join('')}</li>`).join('')
  return [`<${tag}>${body}</${tag}>`, i]
}

function renderTable(rows) {
  const header = splitRow(rows[0])
  const body = rows.slice(2).map(splitRow)
  const isFeatures = header[0] === 'ID' && body.length && /^F-\d+$/.test(body[0][0])
  if (isFeatures) return renderFeatures(header, body)
  const th = header.map((h) => `<th>${inline(h)}</th>`).join('')
  const tr = body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`
}

// Feature tables (chapter 6) become a list with a placement control per row.
// Expected columns: ID | Feature | What it is | Proposed | then any others (Design, Code, Notes…)
function renderFeatures(header, body) {
  const col = (name) => header.findIndex((h) => h.toLowerCase() === name)
  const iFeature = col('feature')
  const iWhat = col('what it is')
  const iProposed = col('proposed')
  const extra = header.map((h, i) => ({ h, i })).filter(({ i }) => ![0, iFeature, iWhat, iProposed].includes(i))
  const rows = body
    .map((r) => {
      const id = r[0]
      const proposed = (r[iProposed] || '').toLowerCase()
      const meta = extra
        .filter(({ i }) => r[i] && r[i] !== '—')
        .map(({ h, i }) => `<span class="f-meta"><span class="f-meta-k">${inline(h)}</span> ${inline(r[i])}</span>`)
        .join('')
      const seg = ['mvp', 'later', 'never']
        .map(
          (p) =>
            `<button type="button" class="seg${p === proposed ? ' is-proposed' : ''}" data-fid="${id}" data-place="${p}">${
              { mvp: 'MVP', later: 'Later', never: 'Never' }[p]
            }</button>`,
        )
        .join('')
      return `
      <li class="f" id="${fAnchor(id)}" data-fid="${id}" data-proposed="${proposed}">
        <div class="f-main">
          <span class="f-id">${id}</span>
          <span class="f-name">${inline(r[iFeature] || '')}</span>
          <span class="f-what">${inline(r[iWhat] || '')}</span>
          <span class="f-metas">${meta}</span>
        </div>
        <div class="f-side">
          <span class="f-proposed">Proposed: <strong>${escapeHtml(r[iProposed] || '—')}</strong></span>
          <div class="segs" role="group" aria-label="Placement of ${id}">${seg}</div>
        </div>
      </li>`
    })
    .join('')
  return `<ul class="features">${rows}</ul>`
}

function renderBlocks(md, mode = 'chapter') {
  const lines = md.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      if (fence[1] === 'mermaid') {
        out.push(`<div class="diagram"><pre class="mermaid">${escapeHtml(buf.join('\n'))}</pre></div>`)
      } else {
        out.push(`<pre class="code"><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      }
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = Math.min(h[1].length + (mode === 'q' ? 3 : 0), 5)
      const tag = `h${level}`
      if (level === 1) {
        out.push(`<h1>${inline(h[2])}</h1>`)
      } else {
        const id = headingId(h[2])
        const comment = commentable(tag)
          ? `<button type="button" class="comment-btn" data-comment aria-label="Comment on this section" hidden>Comment</button>`
          : ''
        out.push(`<${tag} id="${id}"><a class="anchor" href="#${id}">${inline(h[2])}</a>${comment}</${tag}>`)
      }
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      const text = buf.join(' ').trim()
      const qm = text.match(/^Open question (Q-\d+)\b/)
      if (qm && mode === 'chapter' && questionsById.has(qm[1])) {
        const q = questionsById.get(qm[1])
        if (!placedQuestions.has(q.id)) {
          placedQuestions.add(q.id)
          out.push(questionCard(q))
        } else {
          out.push(
            `<p class="qref"><a href="#${qAnchor(q.id)}">${q.id} · ${inline(q.title)}</a> <span class="q-state" data-state-for="${q.id}">Open</span></p>`,
          )
        }
      } else {
        out.push(`<blockquote>${renderBlocks(buf.join('\n'), mode)}</blockquote>`)
      }
      continue
    }
    if (/^\s*\|/.test(line) && lines[i + 1] && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const rows = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++])
      out.push(renderTable(rows))
      continue
    }
    if (/^\s*(-|\d+\.)\s+/.test(line)) {
      const [html, next] = renderList(lines, i)
      out.push(html)
      i = next
      continue
    }
    const buf = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|>\s?|\s*(-|\d+\.)\s+)/.test(lines[i]) &&
      !(/^\s*\|/.test(lines[i]) && lines[i + 1] && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]))
    ) {
      buf.push(lines[i++].trim())
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`)
  }
  return out.join('\n')
}

// ---------- build ----------

// Windows line endings would stop the line patterns from matching (and the paragraph loop from advancing).
const readText = (file) => readFileSync(join(bookDir, file), 'utf8').replace(/\r\n?/g, '\n')

const questionsMd = readText('questions.md')
const questions = parseQuestions(questionsMd)
questionsById = new Map(questions.map((q) => [q.id, q]))

const chapterFiles = readdirSync(bookDir)
  .filter((f) => /^\d{2}[a-z]?-.+\.md$/.test(f))
  .sort()

const chapters = chapterFiles.map((file) => {
  const md = readText(file)
  const key = file.match(/^(\d{2}[a-z]?)/)[1]
  const number = key.slice(0, 2)
  const title = (md.match(/^# (.+)$/m) || [, file])[1]
  chapterKey = `c${key}`
  headingIds = new Set()
  const before = new Set(placedQuestions)
  let html = renderBlocks(md)
  const placedHere = [...placedQuestions].filter((id) => !before.has(id))
  return { file, key, number, title, html, placedHere }
})

// Questions that no chapter points to go at the end of their chapter. Chapter 7 has three files; its questions
// are numbered by file (150–199 client, 200–249 business, 250–299 system), as the README says.
const homeKey = (q) => {
  if (q.chapter !== '07') return q.chapter
  const n = Number(q.id.slice(2))
  return n < 200 ? '07a' : n < 250 ? '07b' : '07c'
}
for (const q of questions) {
  if (placedQuestions.has(q.id)) continue
  const key = homeKey(q)
  let ch = chapters.find((c) => c.key === key) || chapters.find((c) => c.number === key)
  if (!ch) {
    console.warn(`${q.id}: unknown chapter "${q.chapter}", placed in the last chapter`)
    ch = chapters[chapters.length - 1]
  }
  if (!ch.extra) ch.extra = []
  ch.extra.push(q)
  ch.placedHere.push(q.id)
  placedQuestions.add(q.id)
}

const chapterHtml = chapters
  .map((c) => {
    const extra = c.extra
      ? `<h2 id="c${c.key}-more-questions"><a class="anchor" href="#c${c.key}-more-questions">More questions</a></h2>${c.extra.map(questionCard).join('')}`
      : ''
    return `<section class="chapter" id="c${c.key}" data-chapter="${c.key}">${c.html}${extra}</section>`
  })
  .join('\n')

const plainTitle = (t) => t.replace(/^\d+[a-z]?\.\s*/, '')
const nav = chapters
  .map(
    (c) =>
      `<a class="nav-item" href="#c${c.key}" data-nav="c${c.key}"><span class="nav-num">${c.key.replace(/^0/, '')}</span><span class="nav-title">${escapeHtml(
        plainTitle(c.title),
      )}</span><span class="nav-count" data-count-for="${c.key}"></span></a>`,
  )
  .join('')

const overview = chapters
  .map((c) => {
    const ids = c.placedHere
    return `<a class="ch-card" href="#c${c.key}" data-card="${c.key}" data-qids="${ids.join(' ')}">
      <span class="ch-num">${c.key.replace(/^0/, '')}</span>
      <span class="ch-title">${escapeHtml(plainTitle(c.title))}</span>
      <span class="ch-status" data-status-for="${c.key}">${ids.length ? `${ids.length} questions` : 'No questions'}</span>
      <span class="ch-bar"><span class="ch-bar-fill" data-bar-for="${c.key}"></span></span>
    </a>`
  })
  .join('')

const index = chapters
  .filter((c) => c.placedHere.length)
  .map((c) => {
    const rows = c.placedHere
      .map((id) => questionsById.get(id))
      .map(
        (q) =>
          `<li data-index-q="${q.id}"${q.start ? ' data-start' : ''}><a href="#${qAnchor(q.id)}"><span class="q-id">${q.id}</span> ${inline(q.title)}</a>${q.start ? '<span class="q-start">Start here</span>' : ''}<span class="q-state" data-state-for="${q.id}">${q.status === 'decided' ? 'Decided' : 'Open'}</span></li>`,
      )
      .join('')
    return `<div class="index-group"><h3>${escapeHtml(c.title)}</h3><ul class="index">${rows}</ul></div>`
  })
  .join('')

const book = {
  questions: Object.fromEntries(
    questions.map((q) => [
      q.id,
      { chapter: q.chapter, status: q.status, start: !!q.start, options: q.options.map((o) => o.key), answer: q.answer },
    ]),
  ),
  chapters: Object.fromEntries(chapters.map((c) => [c.key, c.placedHere])),
}

const updated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const template = readFileSync(join(here, 'page.html'), 'utf8')
// Function replacements, so a "$" in the content is never read as a pattern.
const page = template
  .replace('<!--NAV-->', () => nav)
  .replace('<!--OVERVIEW-->', () => overview)
  .replace('<!--INDEX-->', () => index)
  .replace('<!--CHAPTERS-->', () => chapterHtml)
  .replaceAll('__UPDATED__', () => updated)
  .replace('__TOTAL_Q__', () => String(questions.length))
  .replace(/["']__BOOK__["']/, () => JSON.stringify(book).replace(/</g, '\\u003c'))

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, page)
const open = questions.filter((q) => q.status !== 'decided').length
console.log(`${chapters.length} chapters, ${questions.length} questions (${open} open) → ${outFile} (${Math.round(page.length / 1024)} KB)`)
