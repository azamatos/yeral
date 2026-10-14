import type { Preview } from '@storybook/react-vite'
import { UIProvider } from '@yeral/ui/provider'
import '../src/styles.css'

const preview: Preview = {
  decorators: [(Story) => <UIProvider>{Story()}</UIProvider>],
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
