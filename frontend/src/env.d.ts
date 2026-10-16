/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_ISSUER_URI?: string
  readonly VITE_OIDC_CLIENT_ID?: string
  readonly VITE_OIDC_IDIR_HINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  config: Record<string, string>
}
