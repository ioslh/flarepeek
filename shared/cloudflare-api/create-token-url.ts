// Pre-fills the Cloudflare dashboard's token creation form with the
// permissions this extension needs. See
// https://developers.cloudflare.com/fundamentals/api/reference/template/
//
// - Workers Scripts (edit, account): read scripts/versions/custom domains,
//   AND write new deployments — shared/cloudflare-api/deployments.ts's
//   setDeploymentSplit()/rollbackToVersion() need Edit, not just Read, to
//   actually change what's deployed (gradual-split adjustment, rollback).
// - Workers Routes + Zone (read, zone): resolving a hostname to the Worker
//   that serves it.
// - Workers Observability (edit): shared/cloudflare-api/recent-errors.ts's
//   telemetry queries. NOT the same group as "Workers Tail" (that one only
//   covers the older wrangler-tail-style streaming endpoint — confirmed the
//   hard way, it 403s against telemetry.query()). Requested at "edit" because
//   the endpoint persists queries by default; inferred from that behavior,
//   not independently confirmed — "read" is worth trying first if revisited.
// - User Details (read): shared/cloudflare-api/identity.ts's best-effort
//   email auto-detection for multi-token labeling.
// - Account Analytics (read): shared/cloudflare-api/worker-stats.ts's
//   GraphQL Analytics query for the 24h requests/errors/CPU stats card.
// - Workers Queues (read): shared/cloudflare-api/queues.ts's listQueues(),
//   used by use-bindings.ts to resolve a queue binding's queue_name to the
//   queue_id its precise dashboard link needs (see dashboard-links.ts). Only
//   needed for that link to be exact instead of falling back to the Queues
//   list page — read is enough, this extension never writes queue config.
// - Workers Tail (read): shared/cloudflare-api/tail.ts's startTail()/
//   stopTail(), used by entrypoints/sidepanel/live-tail/. This is its own
//   permission group, distinct from "Workers Observability" above — official
//   docs describe it as "Permits use of the `wrangler tail` command for
//   viewing Worker logs", and it's the one that actually gates
//   POST .../workers/scripts/{script}/tails (confirmed against the official
//   permission-group description, not inferred from a 403 the way the
//   Observability/Tail distinction above was). A token created before this
//   was added won't have it — the Live Tail panel's "insufficient
//   permission" state links back to this same CREATE_API_TOKEN_URL so the
//   user can generate a new token that includes it.
//
// The "workers_observability", "user_details", "account_analytics",
// "workers_queues", and "workers_tail" keys follow the same snake_case
// pattern as the other confirmed keys here, but — unlike "workers_scripts" —
// haven't been checked against an official example. If a row doesn't show up
// pre-filled on the token page, add it by hand.
const PERMISSION_GROUPS = [
  { key: 'workers_scripts', type: 'edit' },
  { key: 'workers_routes', type: 'read' },
  { key: 'workers_observability', type: 'edit' },
  { key: 'user_details', type: 'read' },
  { key: 'account_analytics', type: 'read' },
  { key: 'workers_queues', type: 'read' },
  { key: 'workers_tail', type: 'read' },
  { key: 'zone', type: 'read' },
];

// Deliberately the *user* token page (/profile/api-tokens), not the
// account-owned token page (/:account/api-tokens). Account-owned tokens are
// prefixed "cfat_" and only verify via GET /accounts/{account_id}/tokens/verify
// — but shared/cloudflare-api/verify-token.ts calls GET /user/tokens/verify,
// and account_id isn't known until after a zone lookup succeeds (see
// shared/cloudflare-api/zones.ts), so an account-owned token can never pass
// verification here. accountId=* and zoneId=all keep the token usable across
// every account/zone the user can see, matching how findZoneForHostname works.
const permissionGroupKeys = encodeURIComponent(JSON.stringify(PERMISSION_GROUPS));
const name = encodeURIComponent('FlarePeek Extension');

export const CREATE_API_TOKEN_URL = `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${permissionGroupKeys}&accountId=*&zoneId=all&name=${name}`;
