import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// The client site: TanStack Start, server-rendered public pages and client-only account pages (systemPatterns
// "Rendering"). The dev port comes from the `dev` script (PORT_BASE + 1); hosts come from
// `@yeral/lib/site` (shared/config). `vite build` writes dist/client (the browser's files) and dist/server (the
// renderer), which server.mjs serves on Node (ADR 0024).
export default defineConfig(({ command }) => ({
  // VITE_YERAL_ENV, VITE_YERAL_DOMAIN and the shared PORT_BASE reach the app (siteFromEnv)
  envPrefix: ['VITE_', 'PORT_BASE'],
  // the built renderer carries its dependencies, so the Docker image runs it without node_modules
  ...(command === 'build' ? { ssr: { noExternal: true } } : {}),
  plugins: [
    tanstackStart({
      srcDirectory: 'src',
      // file routes in src/app/routes (Start splits each into its own chunk); the router in app/entrypoint (FSD app layer)
      router: {
        entry: 'app/entrypoint/router.tsx',
        routesDirectory: 'app/routes',
        generatedRouteTree: 'app/routeTree.gen.ts',
      },
    }),
    react(),
    // React Compiler memoises for us (techContext "Foundation")
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2023' },
}))
