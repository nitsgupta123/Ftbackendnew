/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_AUDIT_USER?: string;
  readonly VITE_LEGACY_ASSET_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
