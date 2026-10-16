import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// docs/design/tokens.css is the design's source of truth; theme.css must carry the same values.
const design = readFileSync(new URL('../../../../docs/design/tokens.css', import.meta.url), 'utf8')
const theme = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')
const base = readFileSync(new URL('./base.css', import.meta.url), 'utf8')

/** `--name: value;` pairs of a CSS file, normalised (spaces, case, trailing zeros). First occurrence wins. */
function vars(css: string, scope?: 'phone'): Map<string, string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const phoneStart = text.indexOf('@media (max-width: 767px)')
  const part = scope === 'phone' ? text.slice(phoneStart) : phoneStart === -1 ? text : text.slice(0, phoneStart)
  const out = new Map<string, string>()
  for (const m of part.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = m as unknown as [string, string, string]
    if (!out.has(name)) out.set(name, normalise(value))
  }
  return out
}
const normalise = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s*/g, ',')
    .replace(/(^|[^\d])\.(\d)/g, '$10.$2')
    .replace(/(\d\.\d*?[1-9])0+\b/g, '$1')
    .replace(/(\d)\.0+\b/g, '$1')

// design variable → theme variable (null = deliberately not a theme value; reason in the comment)
const MAP: Record<string, string | null> = {
  '--font-sans': null, // family name differs: fontsource registers 'Onest Variable'
  '--fs-display': '--text-display',
  '--lh-display': '--text-display--line-height',
  '--ls-display': '--text-display--letter-spacing',
  '--fs-h1': '--text-h1',
  '--lh-h1': '--text-h1--line-height',
  '--ls-h1': '--text-h1--letter-spacing',
  '--fs-h2': '--text-h2',
  '--lh-h2': '--text-h2--line-height',
  '--ls-h2': '--text-h2--letter-spacing',
  '--fs-h3': '--text-h3',
  '--lh-h3': '--text-h3--line-height',
  '--ls-h3': '--text-h3--letter-spacing',
  '--fs-body-l': '--text-body-l',
  '--lh-body-l': '--text-body-l--line-height',
  '--fs-body': '--text-body',
  '--lh-body': '--text-body--line-height',
  '--fs-dense': '--text-dense',
  '--lh-dense': '--text-dense--line-height',
  '--fs-button': '--text-button',
  '--lh-button': '--text-button--line-height',
  '--fs-small': '--text-small',
  '--lh-small': '--text-small--line-height',
  '--fs-micro': '--text-micro',
  '--lh-micro': '--text-micro--line-height',
  '--fs-label': '--text-label',
  '--lh-label': '--text-label--line-height',
  '--ls-label': '--text-label--letter-spacing',
  '--bg-group': '--color-group',
  '--primary-bg': '--primary-bg',
  '--primary-bg-hover': '--primary-bg-hover',
  '--primary-bg-active': '--primary-bg-active',
  '--primary-shadow': '--shadow-primary',
  '--primary-shadow-active': '--shadow-primary-active',
  '--focus-ring': '--shadow-focus',
  '--input-focus': '--shadow-input-focus',
  '--input-error': '--shadow-input-error',
  '--input-warning': '--shadow-input-warning',
  '--focus-ring-inset': '--shadow-focus-inset',
  '--switch-off-ring': '--shadow-switch-off',
  '--shadow-control': '--shadow-control',
  '--r-input': '--radius-input',
  '--r-btn-s': '--radius-s',
  '--r-btn-m': '--radius-m',
  '--r-btn-l': '--radius-l',
  '--r-card': '--radius-card',
  '--r-pill': '--radius-pill',
  '--r-xs': '--radius-xs',
  '--r-sm': '--radius-sm',
  '--container': '--container-marketplace',
  '--modal-s': '--container-modal-s',
  '--modal-m': '--container-modal-m',
  '--modal-ml': '--container-modal-ml',
  '--modal-l': '--container-modal-l',
  '--drawer-w': '--container-drawer',
  '--shadow-raised': '--shadow-raised',
  '--shadow-sheet': '--shadow-sheet',
  '--scrim': '--scrim',
}
// spacing and component sizes are multiples of the 4px spacing unit (h-11 = 44px), not separate theme values
const SIZE_VARS = /^--(s-\d+|btn-[sml]|input-h|row-[\w-]+|nav-h[\w-]*|sidebar-[\w]+)$/
const target = (name: string) =>
  MAP[name] ??
  (/^--(n|a|st|danger|ink-btn|switch|chart)(-|$)/.test(name) || name === '--a-hover' || name === '--a-line'
    ? `--color-${name.slice(2)}`
    : undefined)

describe('design tokens', () => {
  const d = vars(design)
  const t = vars(theme)

  it.each([...d.keys()].filter((n) => !SIZE_VARS.test(n) && MAP[n] !== null))('%s is in the theme with the same value', (name) => {
    const to = target(name)
    expect(to, `no mapping for ${name}: add it to MAP in tokens.test.ts`).toBeDefined()
    expect(t.get(to!), `${name} → ${to}`).toBe(d.get(name))
  })

  it('size tokens are multiples of the 4px spacing unit', () => {
    for (const [name, value] of d) if (SIZE_VARS.test(name)) expect(parseInt(value) % 4, `${name} = ${value}`).toBe(0)
  })

  it('the phone type scale matches', () => {
    const dp = vars(design, 'phone')
    const bp = vars(base, 'phone')
    for (const [name, value] of dp) expect(bp.get(target(name)!), name).toBe(value)
  })
})
