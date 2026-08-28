# Cloudflare Capability Boundaries Reference

This document collects Cloudflare's official features/limits that were verified while building FlarePeek and that directly constrain the extension's feature boundaries. **The official docs are the only source of truth for these boundaries** — whenever this document conflicts with a code comment or memory, re-verify against the official docs; don't rely on assumption.

Each entry includes: the official link, the official wording (quoted as verbatim as possible), and the concrete impact on our product. Anything that has no official documentation and could only be confirmed by calling the API directly or testing in production is listed separately in the final "Not documented officially, confirmed by testing only" section, with a note on how it was confirmed, so it can be re-verified later or rechecked whenever Cloudflare's docs are updated.

## Version Overrides (preview a specific version)

**Official docs**: https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/

- Mechanism: via the `Cloudflare-Workers-Version-Overrides` request header (an RFC 8941 Dictionary Structured Header, `worker_name="version_id"`) a specific request can be routed to a given version, even when that version has 0% traffic in the current deployment.
- Quote: **"A version override will only be applied if the specified version is in the current deployment."** — only versions that are in the current deployment can be hit by an override.
- Quote: **"Workers currently only supports serving two different versions in one deployment."** — a deployment can serve at most two versions at once (this is a limit explicitly stated in the official docs, not just something we hit via testing).
- Quote: **"Version overrides only apply to `fetch()`-based service binding calls"** — it doesn't apply to RPC-style service binding calls.

**Impact on FlarePeek**: this is the technical foundation for the entire "preview this version" feature in `shared/version-override/`; it also explains why the sidepanel can only offer an Activate button for versions that are "in the current deployment" — a version not in the deployment could theoretically still have an override header injected, but Cloudflare doesn't guarantee it will take effect, and the UI doesn't yet surface that caveat (a possible future improvement).

## Gradual Deployments — version count and candidate window

**Official docs**: https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/

- Quote: **"You can only create a gradual deployment with the last 100 uploaded versions of your Worker."** — only the most recently uploaded 100 versions can be candidates for a new deployment.
- Durable Objects special case: **"only one version of each Durable Object can run at a time"** — at any given moment a Durable Object instance runs exactly one version; gradual-rollout percentages are assigned per instance, not randomly per request.

**Impact on FlarePeek**: `DEFAULT_LIMIT = 40` in `listRecentVersions` (`shared/cloudflare-api/versions.ts`) is our own choice of how many versions to _display_, not a Cloudflare limit — the real hard limit is 100, confirmed by this section together with the next one. The candidate list in `version-combobox.tsx` should in principle cover up to 100 (it currently only shows the most recent 40, which is enough for typical use but not the full range).

## Rollback/deployment eligibility window raised from 10 to 100

**Official changelog**: https://developers.cloudflare.com/changelog/post/2025-09-11-increased-version-rollback-limit/

- Quote: **"The number of recent versions available for a Worker rollback has been increased from 10 to 100."** (2025-09-11)

**Impact on FlarePeek**: this is the basis for an earlier self-correction made during development — it was previously assumed the limit was "the most recent 10", when it had actually been raised to 100 in September 2025. The comment in `shared/cloudflare-api/versions.ts` cites this changelog as its source.

## Rollback's interaction with Durable Object migrations

**Official docs**:

- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/with-durable-objects/

- Quote (rollbacks page): **"You can only roll back to the 100 most recently published versions."** (same limit as above)
- Quote (rollbacks page): rollback is blocked if "a Durable Object class lifecycle change (via exports or the legacy migrations array) has occurred between the version in the active deployment and the version selected to roll back to".
- Quote (rollbacks page): **"Rolling back to a previous version of your Worker will immediately create a new deployment"** — a rollback is really "create a new deployment", not an "undo" operation.
- Quote (with-durable-objects page): **"Durable Object lifecycle changes are atomic operations. Once a lifecycle change is deployed, rollbacks cannot take place to any version prior to the one that included the change."**
- Quote (with-durable-objects page): **"Versions of Worker bundles that change Durable Object class lifecycle cannot be uploaded [via versions upload]"** — a version that adds/removes/changes a Durable Object class must go through `wrangler deploy`; it can't be shipped with just a `versions upload`.

**Impact on FlarePeek**: this is part of the real constraint behind the `everDeployed` field / "never deployed before, rollback may fail" hint in `entrypoints/sidepanel/version-switcher/use-recent-versions.ts` — even when a version's `everDeployed === true`, if a Durable Object migration happened between it and the currently active version, Cloudflare will still reject the rollback, and we currently have no way to detect that (`deploylab`, our companion test project, has no Durable Objects, so this hasn't been exercised; a real user's Worker that uses Durable Objects could hit this unexplained failure when clicking Deploy to roll back to an older version, with no warning surfaced in our UI). **This is a known product gap** — worth adding a dedicated error message for this failure mode instead of falling back to generic error copy.

## `version_metadata` binding

**Official docs**: https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/

- Provides an `env.CF_VERSION_METADATA` binding, so a Worker can read `{id, tag}` at runtime — the id/tag of the version currently handling that request.

**Impact on FlarePeek**: currently only used in `deploylab`'s (our companion test project) `wrangler.jsonc`, to show on the page which version is responding. FlarePeek itself doesn't use this — it was researched during an earlier "what else could we build if we had a backend" brainstorm; the decision at the time was against a backend approach, and this entry is kept only so the research isn't lost, not as a near-term plan.

## GraphQL Analytics API permissions and the orderBy/dimensions relationship

**Official docs**:

- Permissions: creating a token in the Cloudflare Dashboard with Account → Account Analytics → Read is enough to access all adaptive-groups datasets (`workersInvocationsAdaptive`/`kvOperationsAdaptiveGroups`/`d1AnalyticsAdaptiveGroups`/`r2OperationsAdaptiveGroups`, etc.) — no extra permission group is required.
- Querying basics: https://developers.cloudflare.com/analytics/graphql-api/getting-started/querying-basics/

**Impact on FlarePeek**: the permission template pre-filled by `shared/cloudflare-api/create-token-url.ts` requests only a single "Account Analytics: Read" permission, and it covers all four query types — Worker request stats plus KV/D1/R2 usage stats. There's no need to request a separate permission per binding type; this has been confirmed against the official docs, not just assumed.

## Not documented officially, confirmed by testing only (needs periodic re-verification)

The following points have no clear, written confirmation in Cloudflare's official docs; they were confirmed by calling the real Cloudflare API directly or by triggering a real error. **This kind of undocumented behavior carries the risk of being silently changed by Cloudflare** and can't be treated as a long-term stable contract the way the sections above can — it's recommended to periodically re-verify it using `deploylab`.

- **Both slots of a deployment can be versions that have never been live before** (neither slot is required to overlap with the current deployment) — confirmed by calling `deployments.create()` directly; the official docs don't explicitly say whether the two slots need to overlap with the current deployment (the version-overrides doc only states the "at most two versions" count limit, see above). The two `VersionCombobox` components in `entrypoints/sidepanel/version-switcher/deployment-control.tsx` can freely combine any candidate versions, based on this test.
- **In GraphQL adaptive-groups queries, any field referenced by `orderBy` must also appear in `dimensions {}`, or the query fails with "cannot order by date: it is neither aggregated, nor a dimension"** — found via a real user-reported bug (binding usage data not showing at all) that triggered this exact error. The official Querying basics doc's examples happen to already have matching `orderBy`/`dimensions` fields, so it's never stated as a hard requirement anywhere. All three of `shared/cloudflare-api/{kv,d1,r2}-usage.ts` have each been fixed once for this gotcha.
