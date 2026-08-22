import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    default_locale: 'en',
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    // No manual `action` override needed here — the popup entrypoint makes
    // WXT set action.default_popup automatically, so clicking the toolbar
    // icon opens the popup (not the side panel; see entrypoints/popup/).
    permissions: [
      // shared/storage/token-storage.ts and site-token-cache.ts (chrome.storage.local)
      'storage',
      // shared/worker-panel/use-live-tab-hostname.ts — the side panel stays
      // open across tab switches (though it doesn't auto-follow them; see
      // entrypoints/sidepanel/use-pinned-hostname.ts), and both it and the
      // popup need chrome.tabs.onActivated/onUpdated or tab.url populated
      // outside of a fresh activeTab-granting gesture. activeTab's grant
      // doesn't cover that, so this is the broader "tabs" permission.
      'tabs',
      // shared/version-override/version-override.ts (modifyHeaders rules, paired
      // with per-site host permission granted at runtime via optional_host_permissions)
      'declarativeNetRequestWithHostAccess',
    ],
    // Required (not optional): every fetch() from an extension page is subject
    // to normal CORS unless the extension holds host permission for the target
    // origin, and Cloudflare's API does not send permissive CORS headers for
    // arbitrary origins. Without this, every client.*.list()/verify() call from
    // popup/options fails as a generic network error before a response ever
    // comes back — this isn't optional the way the per-zone override is.
    host_permissions: ['https://api.cloudflare.com/*'],
    // Requested per-origin at runtime (chrome.permissions.request) only when the
    // user activates a version override for the site they're currently on —
    // never declared as a required, always-on host permission.
    optional_host_permissions: ['*://*/*'],
  },
});
