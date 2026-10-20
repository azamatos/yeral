/// <reference types="vite/client" />

// What the build reads (vite.config.ts `envPrefix`); every one is optional: unset = local development.
interface ImportMetaEnv {
  readonly VITE_YERAL_ENV?: string
  readonly VITE_YERAL_DOMAIN?: string
  readonly PORT_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
