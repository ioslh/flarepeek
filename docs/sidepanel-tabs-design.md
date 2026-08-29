# Sidepanel Multi-Tab Design

Documents the design decisions behind turning the sidepanel from "pin a single hostname" into "multiple tabs", for reference during implementation and for future readers to understand why it was designed this way. This is a product/interaction design document, not a long-standing coding convention (that's [AGENTS.md](../AGENTS.md)).

## Background

Current state: when the sidepanel opens it pins a hostname, and afterward **does not follow** browser tab switches (`entrypoints/sidepanel/use-pinned-hostname.ts`) — it only shows a `TabChangedBanner` when the active browser tab's hostname changes, and the user has to click it to switch. This exists to avoid "firing a whole round of Cloudflare API requests every time you glance at another tab."

Problem: users need to go back and forth between multiple hosts (e.g. watching several Workers' gradual rollouts at once). The current model forces them to either repeatedly re-pin manually (losing previous state) or open multiple browser windows, each with its own sidepanel.

## Terminology

- **Browser tab**: Chrome's own tab.
- **Panel tab**: an entry in the sidepanel's own internally-rendered tab strip, of two kinds:
  - **Pinned tab**: a panel tab the user actively pinned and that's persisted.
  - **Live tab**: the single panel tab that "follows the active browser tab" — not persisted, its content changes in real time with the active browser tab's hostname.

The sidepanel itself is still one instance per browser window (the Chrome side panel API doesn't support multiple panels open at once); the multi-tab feature is a tab strip implemented internally within that one instance.

## Data model

```ts
interface PinnedTab {
  hostname: string; // unique key
  forcedTokenId: string | null; // the account this host is individually locked to, independent of other tabs
}
```

(A custom-naming `label` field isn't part of this round's UI, so it's not added yet; order is just array order — no `addedAt` is needed.)

- `PinnedTab[]`: an ordered array, persisted in `chrome.storage.local` (not `sync` — consistent with the existing convention for token storage; this kind of data is somewhat sensitive and shouldn't go to the cloud).
- The live tab is **never persisted** — it's pure derived state: the currently active browser tab's hostname, from the existing `useLiveTabHostname`.
- Which panel tab currently has focus (is active): **runtime state local to each sidepanel window instance, not persisted** — reopening the sidepanel re-derives it from the initial rules below. The pinned-tab list itself should be **shared globally** (multiple sidepanel windows see the same list), but current focus is independent per window — you can watch different sites in two windows at once.

## Live-tab state machine

There's exactly one trigger source: changes from `useLiveTabHostname()` (switching browser tabs, or navigating to a new host within the current tab). On each change:

1. **Focus is currently on the live tab, and the new host matches a pinned tab** → focus shifts to that pinned tab (this isn't "stealing" focus — it's swapping the same content for its canonical pinned instance, to avoid showing the same host in both a pinned tab and the live tab at once).
2. **Focus is currently on the live tab, the new host doesn't match any pinned tab, and it's http(s)** → the live tab's content switches in place to the new host (the same slot gets new content, it's not a new tab), and its label in the tab strip updates accordingly.
3. **The new host isn't http(s) (`chrome://`, a new-tab page, etc.), or there's no active tab** → the live tab shows a "no site detected" empty state, without affecting any pinned tabs.
4. **Focus is currently on some pinned tab (not the live tab)** → a browser tab switch only updates what the live tab _displays_ in the tab strip (so the user can glance at it), and **never steals focus automatically** — even if the new host matches a pinned tab, focus doesn't jump there. This rule entirely replaces the existing `TabChangedBanner`/`isStale` mechanism. Rules 1 and 4 have a clean boundary: automatic switching only ever happens when focus is _already_ on the live tab; focus on any pinned tab is never interrupted by a browser tab switch.
5. **One-way relationship**: clicking a panel tab (pinned or live) to switch to it does **not** activate the corresponding browser tab; only the browser tab drives the live tab, never the other way around.

## Pin / close / manually add

- Hovering the live tab in the tab strip reveals a 📌 "Pin" affordance after the hostname text (see "Visuals and page structure" below): clicking it writes the currently-shown host into `PinnedTab[]` and inserts it into the tab strip. Right after pinning, the live tab is immediately re-evaluated per state-machine rule 1.
- Hovering any pinned tab reveals an ✕ "Unpin" affordance: this removes it from storage. If the tab being closed currently has focus, focus moves to the adjacent pinned tab on the left; if there is none, it falls back to the live tab.
- A manual "+" button: opens a host input (a full URL can be pasted; the hostname is extracted from it), and on confirm it's **inserted directly as a pinned tab** (there's no corresponding active browser tab backing it, so it can never be a live tab — no need for the extra step of first appearing as the live tab and then being pinned). Right after creation, focus switches to the new tab immediately (see the mounting strategy below — this step naturally satisfies "mounted the moment it's first viewed").

## Mounting strategy (lazy mount + keep-alive)

Goal: adding more pinned tabs shouldn't make "opening the sidepanel" slower or fire a burst of requests all at once.

- The sidepanel keeps a runtime `mountedTabs: Set<hostname>` (pure React state, **not persisted** — it starts empty/with only the initially-focused tab each time the sidepanel is reopened).
- Initially, only the tab that becomes **the first one shown after this open** is in that set — there's no "restore the last focused tab" on cold start (focus was never persisted in the first place, see "Data model" above): if there's a handoff hostname from the popup, that's used; otherwise it's whatever host the live tab currently points to. Every other pinned tab is just an entry in the tab strip — its content component isn't rendered and it makes no requests.
- The first time a user clicks a pinned tab → its hostname is added to `mountedTabs`, and only then does it actually mount and actually fetch. Switching away and back after that is just CSS show/hide (similar to Radix Tabs, but the reverse of `forceMount`-unmount: once mounted, it stays mounted forever) — the component tree stays alive, with no re-fetching.
- When the live tab gets pinned: its already-mounted component instance/state is converted in place into the pinned tab (reusing the existing entry for that hostname in `mountedTabs`) — going from live to pinned doesn't by itself trigger an extra re-fetch.
- The live tab itself **doesn't use this keep-alive scheme**: a host change is always a fresh mount (with a brief loading flash) — this is intentional. The concern that "following every switch is expensive" is precisely scoped down to affect only this one live-tab slot; pinned tabs are completely unaffected.

## Favicon: built, then removed

At one point favicons were shown per tab using Chrome's built-in `chrome-extension://<id>/_favicon/` endpoint (which requires the `"favicon"` permission in `manifest.permissions`). It was removed entirely in the third visual-polish pass, in favor of a "cleaner tab list" — tabs are now plain text, and the `favicon` permission, `shared/tabs/favicon-url.ts`, and the `PanelTabFavicon` component were all deleted along with it.

This is kept as a record because: if it's ever added back, this approach is a verified-working path (no external service, no network requests, Chrome falls back to a generic icon automatically when none is found, and it reads from local cache so it doesn't require the site to currently be open in a browser tab). If it does come back, remember to re-add the `favicon` permission to `wxt.config.ts` too.

## Visuals and page structure (second-round final design, replacing the original "progressive disclosure State A/B" design)

The first version had a special state for "0 pinned tabs: big title, no tab strip shown". After user feedback that it "lacked design sense," it was scrapped and replaced with the following — **the tab strip always renders, regardless of how many pinned tabs there are**, with no more State A/B distinction:

- **Page header**: the tab strip on the left (`PanelTabStrip`, horizontally scrollable), and the fixed, non-scrolling `AccountControl` on the right — now that it's anchored to the header, what it shows/controls is **the currently active tab's own** account-lock state, not one single global account (account locking is still per-tab; only the control's position is now unified).
- **Tabs are chips, not plain text**: each tab sits on a rounded (`rounded-md`) hit area; the active tab picks up a soft accent-tinted background (`bg-accent`, the same orange-50 already used elsewhere for accent surfaces), inactive tabs stay transparent until hover (`hover:bg-muted`). No favicon at any state. The active tab's text also uses the accent color (`text-primary`, Cloudflare orange-red `#ea580c`, `--primary` in `shared/ui/globals.css`); inactive tabs are neutral gray. The font is a large sans-serif with a condensed width (`font-stretch-extra-condensed`) plus `tracking-tight`, so hostnames can be shown tightly packed within limited width. Pinned and live tabs are rendered by the same internal component, with identical styling logic. (An earlier iteration of this design deliberately avoided any background/border on tabs, in reaction to the four content cards below feeling dated — see "Content area" below. Once those cards were replaced with plain dividers, a bare-text tab strip started reading as _under_-designed by contrast; the chip treatment reintroduces just enough surface to anchor "this is the active tab" without bringing back a bordered-card look anywhere else.)
- **Action buttons come after the text, revealed on hover**: at rest, a tab is just its hostname text. On hover (or keyboard focus), the tab **expands to the right** while the action icon **scales up from nothing** at the same time — the two animations work together, so the icon "grows into" the newly-opened space rather than appearing the instant the space exists. A pinned tab's action is ✕ (unpin); the live tab's is 📌 (pin).
- The **"+" manual-add button is always visible**, with no more "only appears once there's at least one tab" gate — since the tab strip itself always renders now, the entry point's complexity no longer needs to scale with the tab count either.
- **Everything else moves down into each tab's own content area**, with no more "shared header row" at all: `RefreshButton` and `DetectionModeToggle` (live-tab-only) both live at the top of their respective `PanelTabPane`; `AccountControl` is the only control that's truly shared and anchored to the page header.

### How users tell "pinned" from "live" apart

Once the tab strip's styling is unified, a new problem appears: the two kinds of tabs look identical, so how does the user know "how many of these are ones I pinned myself, versus the one that follows the browser"? The final approach rests on two judgments:

1. **Mark the one exception, not the majority.** There can be many pinned tabs, but there's always exactly one live tab. Decorating every pinned tab with a pin icon is expensive and noisy; giving the single outlier a distinguishing feature is cheap and has strong contrast. So: pinned tabs stay plain text, and the live tab carries the marker.
2. The concrete marker = **a group divider + a live dot**:
   - A very faint vertical divider line between the group of pinned tabs and the live tab. This borrows the existing mental model of Chrome's own "pinned tabs cluster on the left," so there's nothing new to teach. **It only appears once there actually are pinned tabs** — with just the single live tab at the start, there's no divider, since there's no "grouping" to speak of yet.
   - A small dot before the live tab's hostname, expressing "live/following." The dot uses `bg-current` to directly inherit the text's current color state (orange-red when active, neutral gray otherwise), without introducing a second color. Hovering the dot shows a tooltip explaining what it means, so the marker explains itself.
   - The 📌 revealed on hover then naturally follows up with "you can turn this into a pinned one."

Also discussed, but **not done this round**: teaching through behavior — e.g. giving the live tab's text a transition animation when the browser tab switches (to emphasize "only this one is moving"), sliding a tab from the live position into the pinned group when 📌 is clicked, or a collapse animation when the live tab disappears because it matched a pinned tab. All of these could reinforce the concept further and can be added later if needed.

## Content area: from "four cards" to "one document"

Once the tab strip was finalized, the default shadcn card look of the four content blocks below (`WorkerStatsCard` / `DeploymentBar` / `RecentErrorsPanel` / `BindingsPanel`) started to feel dated. Four problems were diagnosed, with four corresponding fixes:

1. **The borders weren't carrying any information.** Stacking four cards just produces four rectangles; the borders are neither clickable boundaries nor grouping semantics. → Drop the cards entirely, and replace them with **very faint dividers** between sections (`divide-y` on `version-switcher.tsx`), plus each section's own vertical padding. The whole panel goes from "a stack of boxes" to "one document."
2. **Titles had four different styles** (`CardTitle` / `AccordionTrigger` / `font-mono text-[9px]` / none at all). → Extracted `entrypoints/sidepanel/panel-section.tsx`: a unified small heading (reusing the tab strip's condensed uppercase look, shrunk and grayed, reading as one level below the large tab labels) + an optional title link + optional right-aligned actions. Wherever this heading style needs to attach to its own element (like the Bindings accordion, where the trigger itself _is_ the title), use the exported `PANEL_SECTION_HEADING_CLASS`.
3. **The numbers that most deserve a glance were actually the smallest** (`text-sm`, same size as body text). → The three WorkerStats numbers are enlarged to `text-2xl` with a condensed font, labels in small gray text above and left-aligned; the error rate turns red when > 0 and stays neutral otherwise, letting the state speak for itself.
4. **`DeploymentBar`, the only genuinely well-designed piece, was getting diluted** — that dark bar was wrapped in a generic card just like the other three. → Once the outer card is dropped, it becomes the only dark block on the whole panel, standing out without adding anything.

Also, the error list originally had "red border, red background" on every row, which got very noisy with four or five entries. Changed to **a thin red vertical line on the left with a normal background**, with red reserved for accenting the status code — same information density, much less noise.

The two full-panel empty states (`NoTokenEmptyState`, `ManualDetectionPending`) **keep the card treatment**: they replace the entire content area rather than sitting alongside the sections above, so a card still fits there.

## The traffic bar: from "progress bar" to "instrument"

This bar is the extension's signature element — the first thing a user should see on opening it. The first implementation ended up as just "a dark rounded bar + two gradient blocks + a centered percentage," which is what any dashboard looks like — everything that made it distinctive in the original demo (the horizontal axis being simultaneously a hash space, request landing points, and historical marks) got lost along the way. Diagnosis and the corresponding fixes:

**Basic refinement**

1. **Green was foreign, and its meaning was wrong.** `emerald-500/700` isn't in the palette (`globals.css` only has neutral + brand orange + destructive), and green-vs-orange implies "good vs. warning" — but the two slots are just "incumbent version vs. new version," with no good/bad connotation. → **Slot A becomes neutral dark gray (the incumbent), slot B becomes brand orange (the one being rolled out)**. The orange block growing = the rollout advancing; filling the whole bar orange = it's complete — the color itself now tells the story. `version-slot.tsx`'s text color was updated to match (`text-emerald-700` → `text-neutral-700`).
2. **The gradient was purely decorative**, encoding no information → changed to a flat fill.
3. **`h-9` (36px) couldn't carry the above-the-fold lead role** — the tab strip above it is `text-2xl`, so the hierarchy was backwards → gradually increased to `h-16` (64px), with the on-bar percentage growing to match at `text-2xl`. Note that the `TRACK_HEIGHT_PX` constant has to change along with it (the wave geometry depends on it), and the editing-mode slider handle has to grow taller too (`h-18`, with 8px overhang top and bottom).
4. **The percentage was buried inside the color block and disappeared below `LABEL_MIN_PERCENT = 14`** — precisely the smallest, most-important-to-see canary ratios (1%, 5%) became invisible.

   A "move it below the divider as a caption line" approach was tried in between, but the percentage really belongs on the bar itself; the eventual solution was a **label-escape mechanism** (below).

**The percentage label's "escape" mechanism**

With two versions, both percentages are drawn directly on the bar. The hard part is that a very narrow segment (a 1% canary) has no room for text:

- Segment wide enough → the label centers within its own segment, white text, using the same condensed sans-serif (`font-stretch-extra-condensed` + `tracking-tight`) as the hostnames in the tab list.
- Segment too narrow → the label **jumps across the divider onto the other, wider segment**, but wears a small color chip in **its own side's color** plus white text, so it's still clear which segment it belongs to.
- Why this works without causing confusion: the two numbers always sum to 100, and the threshold is 12% (well under 50%), so **at most one label can ever be too narrow to fit at a time** — the two labels never both escape at once, so they never collide.
- An escaped label stays `LABEL_ESCAPE_GAP_PX` (8px) away from the divider, just enough to clear the 12px-wide wave band and the editing-mode slider handle.
- Why not just write the orange text on the dark gray background directly: not enough contrast, and two same-colored numbers would be hard to attribute to the right side.

**"Fits or not" is judged in actual pixels, not a fixed percentage threshold.** It was originally hardcoded at 14%, but that number depends on both font size and panel width — change either one and it silently goes wrong. The current approach:

- A `ResizeObserver` measures the track's actual pixel width (which also keeps the judgment correct as the panel resizes).
- The label's own width is estimated from its characters (digits / `%` / `.` each get a per-em step constant), **not measured directly** — measuring directly would require "render first, then measure" in two passes, and this value changes every frame while dragging.
- The test: `segment pixel width ≥ estimated label width + padding on both sides`.
- The centering position is likewise clamped in pixels (the center must stay at least half a label's width plus padding from either end), replacing the old hardcoded 8%/92%.

Result: the threshold now tracks panel width automatically — about 19% on a 288px track, but only 9.3% on a 500px one. Tested across the full range (288/320/350/400/500px tracks × 0.5%–99.5%), the smallest observed margin stayed a stable 6px (exactly the configured padding) — no overflow, no overlap, and never both labels escaping at once.

`LABEL_FIT_FALLBACK_PERCENT` is only used for the first frame (before `ResizeObserver` has reported a width) and plays no role after that; it's set conservatively, so a borderline label would rather "start as a chip, then settle into the segment" than "overflow first, then get corrected."

The payoff of judging dynamically: font size was later bumped from `text-xl` to `text-2xl` with **zero changes to the fitting logic** — the threshold just shifted itself from ~16% to ~19% (on a 288px panel). With a fixed threshold, that font-size change would have silently introduced overflow.

**`VersionSlot` used to also show its own copy of the percentage** (also `text-2xl`), which became redundant once the percentage moved onto the bar — the same number, same size, stacked right above it, competing for the same glance. It's been removed; `VersionSlot` now only shows the tag / version id / role badge / pin button / preview link.

**A single-version deployment also draws a label** (a "100%" centered across the whole bar). There's a pitfall worth recording here: it was originally, deliberately, omitted (a lone "100%" on a solid-colored bar felt redundant, since `VersionSlot` still printed the same number at the time); once `VersionSlot`'s percentage was removed as "redundant," the single-version case ended up **showing the percentage nowhere at all**. Before deleting a display that looks redundant, first confirm it isn't the only source of that information on some other branch.

**Two touches that make it distinctive**

5. **A ruler**: fine 5% ticks plus major 10% ticks along the top edge, drawn with `repeating-linear-gradient` (not dozens of DOM nodes). This is the key move that turns a "progress bar" into an "instrument," directly echoing the original concept that "the horizontal axis is an evenly divided hash space, and the boundary falls somewhere within it."
6. **A history trail**: fine ticks drawn above the bar showing where the boundary sat in this Worker's last few deployments, fading with age — one glance shows "this Worker's gradual-rollout trajectory." The data comes from a new `boundaryTrail` field in `shared/cloudflare-api/deployments.ts`: walking backward from the latest deployment, **it keeps collecting as long as the version set stays the same**; the moment it changes, it stops (that's a different rollout, and its boundary position says nothing about the current one's progress). Slot order counts as part of the key too, since order determines Durable Object ownership, and swapping slots really is a different situation. A single-version deployment has no boundary, so it returns empty. Capped at 4 entries — more than that turns a "trail" into "noise." Not shown while dragging — at that point it would be misread as "the position you just dragged to."

**The boundary is a flowing wavy edge**: in view mode, the two colored blocks aren't split by a straight seam — they're split by a slightly undulating, still-overall-vertical wavy edge that slowly flows downward (`flarepeek-boundary-flow` in `globals.css`), read as "traffic is flowing through this point in real time."

This went through two discarded iterations along the way, both of which cut corners in the implementation:

> **First attempt: fade in/out** (a 4s opacity cycle) — too subtle, barely noticeable. "Flowing" communicates real-time-ness better than "fading," and it's more in line with the "requests landing" metaphor from the original demo.
>
> **Second attempt: a straight color seam with a white wavy stroke drawn on top** — the actual color boundary was still a straight vertical line; the wave was just a decorative overlay. **The correct approach is for the color boundary itself to be the wave**: left of the wave is the left color, right of it is the right color.

Key points of the current implementation:

- **The color boundary itself is the wave**: a 12px-wide band is overlaid at the boundary, recolored by wave shape using **two fill paths** (`fill-neutral-700` on the left, `fill-primary` on the right) — the wave is the **shared edge** between the two fills. No stroke. Both paths sit in the same `<g>` and animate together, so the shared edge always lines up exactly.
- **Irregular but strictly loopable**: the waveform is **three summed sine waves** (amplitudes 1.15 / 0.7 / 0.45, out of phase), so it doesn't look textbook-sinusoidal. The trick is that each component completes an **integer number of cycles** within one tile height (3 / 5 / 7 cycles), so the combined waveform lines up exactly, head-to-tail, over `WAVE_TILE_PX` — shifting by one tile aligns perfectly, so the loop is seamless. **True randomness can't be used**: it would break loopability, and the shape would look different on every re-render.
- **Two constants that must stay in sync**: the animation's `translateY` distance must equal `WAVE_TILE_PX` (currently both 96px) — changing one means changing the other, and both files carry a cross-reference comment reminding of this. The larger the tile, the longer the loop period and the less noticeable the repetition (currently 96px / 14s).
- The path is drawn from `-WAVE_TILE_PX` down to the bottom of the track, so the band stays fully covered throughout the translation.
- **Skipped at the two ends**: when the boundary lands exactly at the edge of the track, the band would get half-clipped, leaving the wrong color painted onto the end of the bar — so the wave isn't rendered when `percentB` is 0 or 100.
- The view-mode container has `overflow-hidden` for a clean clip on the band; this can't be added to the editing-mode container, since the slider handle there is taller than the track and needs to be allowed to overflow.

Respects `motion-safe:`: with reduced motion requested, the wave stays static, but **it's still a wavy edge** — the shape doesn't depend on the animation. Editing mode doesn't use the wave at all; the boundary there is carried by the slider handle, and having both markers stacked at the same spot would clash.

## Live tab detection mode: automatic / manual

Problem: the live tab follows the active browser tab by default — so as a user casually switches tabs, each new host is silently probed to see if it's one of their Cloudflare assets (`useWorkerLookup` trying every token in turn). This is exactly what the earlier "sidepanel doesn't follow tabs" design was meant to avoid — this round's live-tab-following experience narrows the impact precisely, but doesn't eliminate it. So: add a toggle and let the user decide whether they want this "background probing" at all.

- **Entry point**: at the top of **the live tab's own content area** (not the shared header) there's a subtle small icon (a radar icon) at all times; clicking it opens a Popover with an explanation and a toggle. No gating on pinned-tab count — it's always there, just visually understated so it doesn't compete for attention with the main flow.
- **Automatic mode (default)**: unchanged from today — the live tab re-detects every time the active browser tab changes.
- **Manual mode**: when the active browser tab changes, the live tab only updates the hostname shown in the tab strip (this part is already free — `useLiveTabHostname` just reads `chrome.tabs`, no Cloudflare API involved), but it **doesn't trigger** an actual Cloudflare detection/request. The live tab's content area shows a pending-detection empty state (hostname + a short explanation + a "detect" button), and the first real lookup only happens when the user clicks it.
- **The load entry point = the refresh entry point**: not two separate buttons. The existing refresh button (the `refreshKey` mechanism in `PanelTabPane`) is already the trigger for "should this refetch," and manual mode just routes "should this pane auto-fire its first fetch when it appears" through that same toggle — in manual mode it defaults to not firing automatically, and clicking refresh is effectively "detect." The button's tooltip copy varies by state: "Detect this site" before the first lookup, "Refresh" after — same button, same logic, just different copy depending on state.
- **Only affects the live tab**: pinned tabs always "auto-load the moment they're first viewed" (the lazy-mount rule already guarantees they never fire needlessly) — this toggle doesn't change pinned-tab behavior.

Technically: `shared/worker-panel/use-worker-lookup.ts` needs a new `enabled = true` parameter and a new `idle` state — when the parameter isn't passed, behavior is unchanged, so the popup's own call site is unaffected.

**Points that need extra care in the copy** (specifically called out by the user):

- The pending-detection empty state must not look "broken" or "stuck" — it needs to clearly say "this is manual detection mode, click the button to start."
- The toggle's own tooltip/explanation needs to make clear _why_ someone would want manual mode (a privacy/performance angle: not wanting every casually-visited site probed to see if it's a Cloudflare asset) — it can't be a bare on/off with no context.

## Mechanisms replaced by this change

- `usePinnedHostname`'s single-pin concept → replaced by `PinnedTab[]` + the live tab.
- `TabChangedBanner` / `isStale` → replaced by live-tab state-machine rule 4; no extra banner needed anymore.
- `sidepanel-handoff.ts` (the one-time hostname handoff when the popup's "open full panel" button is used) → semantics unchanged, but the handoff target goes from "become the single pin" to "become the live tab's initial value (or jump straight to it, if it's already a pinned tab)."
- `entrypoints/background/tab-badge/tab-badge-orchestrator.ts` (the toolbar icon badge) is entirely independent and unaffected.

## Left unresolved, for the implementation phase

- Tab-strip overflow (how to scroll/collapse when there are many pinned tabs) — start with the simplest version, no hard cap on count for now.
