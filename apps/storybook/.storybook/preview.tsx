import type { Preview } from '@storybook/react-vite'
import { setTextStretch } from '@yeral/i18n'
import { MapTiles } from '@yeral/ui/map-frame'
import { UIProvider } from '@yeral/ui/provider'
import { Fragment } from 'react'
import '../src/styles.css'

const preview: Preview = {
  // «Text: +30 %»: the apps' words about as long as Russian's (book Q-101, plan P3), to see what a screen does with them
  globalTypes: {
    text: {
      description: 'Text length',
      toolbar: {
        title: 'Text',
        icon: 'paragraph',
        items: [
          { value: 'as written', title: 'As written' },
          { value: 'longer', title: '+30 % (Russian length)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { text: 'as written' },
  decorators: [
    (Story, { globals }) => {
      const longer = globals.text === 'longer'
      setTextStretch(longer ? 1.3 : 1)
      return (
        // a new length makes the story anew, so its words are read again
        <Fragment key={longer ? 'longer' : 'as written'}>
          <UIProvider>
            {/* maps draw their ground only: the story tests stay offline and the same on every run */}
            <MapTiles style={null}>{Story()}</MapTiles>
          </UIProvider>
        </Fragment>
      )
    },
  ],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // accessibility violations fail the story tests (ADR 0013)
    a11y: { test: 'error' },
    viewport: {
      options: {
        xs: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
        sm: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
        md: { name: 'Laptop 1024', styles: { width: '1024px', height: '768px' } },
        xl: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' } },
      },
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Foundations',
          'Actions',
          'Inputs',
          'Selection',
          'Status',
          'Display',
          'Overlays',
          'Pickers',
          'Navigation',
          'Data',
          '*',
        ],
      },
    },
  },
}

export default preview
