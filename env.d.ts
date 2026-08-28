// Augments WXT's generated ImportMetaEnv (.wxt/types/globals.d.ts) via
// declaration merging — see entrypoints/background/dev-token-seed.ts, the
// only reader of this var.
interface ImportMetaEnv {
  readonly WXT_DEV_CF_API_TOKENS?: string;
}
