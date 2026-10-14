import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

// Storybook's own UI in Ýeral colours; brandTitle is also the browser tab title.
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Ýeral design system',
    brandUrl: 'https://storybook.yeral.app',
    brandImage: './brand/yeral-lockup-ink.png',
    brandTarget: '_self',
    colorPrimary: '#5a3ff0',
    colorSecondary: '#5a3ff0',
    appBg: '#f6f6f8',
    appContentBg: '#ffffff',
    appBorderColor: '#e6e6ea',
    appBorderRadius: 12,
    textColor: '#101014',
    textMutedColor: '#5a5a64',
    barSelectedColor: '#5a3ff0',
    inputBorderRadius: 8,
  }),
})

// Storybook titles the tab «… ⋅ Storybook» (or «storybook - Storybook» before a page loads); show our name instead.
const brand = 'Ýeral design system'
const retitle = () => {
  const t = document.title
  if (!t.endsWith('Storybook')) return
  const page = t.replace(/\s*[⋅-]\s*Storybook$/, '')
  document.title = page && page.toLowerCase() !== 'storybook' ? `${page} ⋅ ${brand}` : brand
}
retitle()
new MutationObserver(retitle).observe(document.head, { subtree: true, childList: true, characterData: true })
