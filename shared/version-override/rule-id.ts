// declarativeNetRequest rule IDs must be positive integers. Deriving the ID
// from the hostname (rather than an incrementing counter) means re-enabling an
// override for the same site always replaces its own rule instead of piling up
// orphaned ones.
export function hostnameToRuleId(hostname: string): number {
  let hash = 5381;
  for (let i = 0; i < hostname.length; i++) {
    hash = (hash * 33) ^ hostname.charCodeAt(i);
  }
  return ((hash >>> 0) % 1_000_000) + 1;
}
