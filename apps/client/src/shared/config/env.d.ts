/// <reference types="vite/client" />

// What the build reads (vite.config.ts `envPrefix`); every one is optional: unset = local development.
interface ImportMetaEnv {
  readonly VITE_YERAL_ENV?: string
  readonly VITE_YERAL_DOMAIN?: string
  readonly PORT_BASE?: string
  // the ways to reach Ýeral (book F-174): unset = not shown
  readonly VITE_YERAL_SUPPORT_PHONE?: string
  readonly VITE_YERAL_SUPPORT_TELEGRAM?: string
  readonly VITE_YERAL_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
