import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

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
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2023' },
})
