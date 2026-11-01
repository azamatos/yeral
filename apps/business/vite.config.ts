import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The business workspace: a static SPA (systemPatterns "Rendering"). The dev port comes from the `dev` script
// (PORT_BASE + 2, techContext "Local development"); hosts come from `@yeral/lib/site` at runtime (shared/config).
export default defineConfig({
  // VITE_YERAL_ENV, VITE_YERAL_DOMAIN and the shared PORT_BASE reach the app (siteFromEnv)
  envPrefix: ['VITE_', 'PORT_BASE'],
  plugins: [
    // file routes in src/app/routes, one chunk per route
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/app/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    // React Compiler memoises for us (techContext "Foundation")
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // installable (book F-096, slice 4's D2): the built shell cached so it opens with no connection, the worker and the
    // manifest at the root, where the static server sends them `no-cache`; no data is ever cached
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ýeral Business',
        short_name: 'Ýeral',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/v1\//, /^\/media\//],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2023' },
})
