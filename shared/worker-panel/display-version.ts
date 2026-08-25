// One version as the UI needs it: the deployment's own data (id, share of
// traffic) merged with the upload metadata that only the versions endpoint
// carries. Lives here rather than beside any one component because both
// entrypoints build it — see entrypoints/popup/popup-app.tsx and
// entrypoints/sidepanel/version-switcher/deployment-bar.tsx.
export interface DisplayVersion {
  versionId: string;
  // null = not part of the live deployment — a candidate in the version
  // picker rather than something currently serving traffic.
  percentage: number | null;
  tag: string | null;
  message: string | null;
  createdOn: string | null;
  // Who uploaded it. With neither a tag nor a message — a plain
  // `wrangler versions upload` leaves both unset — the timestamp and author
  // are all that make one hash tellable from another.
  authorEmail: string | null;
}
