interface ResolveActiveTabParams {
  pinnedHostnames: string[];
  // The dynamic tab's current content — whatever the live browser tab's
  // hostname is right now (or null: no http(s) active tab).
  dynamicHostname: string | null;
  activeHostname: string | null;
  isActiveDynamic: boolean;
}

interface ResolveActiveTabResult {
  activeHostname: string | null;
  isActiveDynamic: boolean;
}

// The one piece of the multi-tab model worth isolating and testing on its
// own: deciding whether a change to the dynamic tab's content should move
// panel focus. It only ever does so when focus was *already* on the dynamic
// tab and it now happens to match a pinned tab — that's not stealing focus,
// it's just redirecting the same content to its canonical pinned instance
// instead of showing a duplicate. Focus already sitting on some other
// pinned tab never gets pulled away by browser-tab activity — see
// docs/sidepanel-tabs-design.md's "one-way relationship" rule.
export function resolveActiveTab(params: ResolveActiveTabParams): ResolveActiveTabResult {
  const { pinnedHostnames, dynamicHostname, activeHostname, isActiveDynamic } = params;

  if (isActiveDynamic && dynamicHostname !== null && pinnedHostnames.includes(dynamicHostname)) {
    return { activeHostname: dynamicHostname, isActiveDynamic: false };
  }

  return { activeHostname, isActiveDynamic };
}
