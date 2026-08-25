# QA Report — Route Navigator

Manual + scripted testing of all five features (multi-stop planner, route
alternatives, elevation profile, save-and-share, plus the shared map/backend
layer). All bugs listed below were reproduced, then fixed and re-verified.

## Test cases

| # | Area | Steps | Expected result |
|---|------|-------|------------------|
| T1 | Planner | Click map 5 times to add waypoints | 5 numbered markers + list rows; route drawn; 6th click refused with "Maximum of 5 waypoints reached" |
| T2 | Planner | Drag a row to a new position | Marker numbers and route redraw to match the new order |
| T3 | Planner | Add 4 out-of-order stops, click "Optimize Order" | List re-sorts to OSRM's order, route redraws, distance/duration shown; a later manual drag falls back to manual mode |
| T4 | Planner | Click "Clear" | All markers, route, and summary removed; Optimize/Share disabled |
| T5 | Alternatives | Click Start, then End in a city with 2+ route options | Up to 3 distinctly colored routes drawn, primary thicker; side cards show km/min |
| T6 | Alternatives | Click a route line on the map | That route highlights (thicker, brought to front, others dimmed) and **stays highlighted** |
| T7 | Alternatives | Click a route card, click it again | Selects then returns to the default (all-routes-even) view |
| T8 | Alternatives | Pick a Start/End pair with only one route | Panel shows "No alternative route found for this pair" instead of an empty state |
| T9 | Elevation | Choose Walking, click Start then End | Route drawn, elevation chart renders, summary shows km/min/gain |
| T10 | Elevation | Hover the chart | A marker moves along the route on the map to match |
| T11 | Elevation | Hover the route line on the map | The matching point highlights on the chart |
| T12 | Elevation | Toggle Walking ↔ Cycling after a route is loaded | Route and chart refresh to match the new profile, no stale data left over |
| T13 | Share | Build a planner/alternatives/elevation route, click Share, open the generated URL | Same tab, same route, same profile (where applicable) restored exactly |
| T14 | Backend | POST malformed bodies (`{"coordinates":[1,2]}`, out-of-range lat/lng, non-array) to `/api/route`, `/api/trip`, `/api/elevation` | Clean `400` response; server keeps running |
| T15 | Race conditions | Rapidly repeat an action that triggers a fetch (add waypoints quickly, toggle profile quickly, or click Clear while a fetch is in flight) | Final UI state always matches the *last* action; no reappearing/stale data |

## Bugs found

### 1. [Critical] Malformed request bodies crash the entire server
**Where:** `routes/routing.js` — `/api/route`, `/api/trip`, `/api/elevation`
**Repro:** `POST /api/route` with `{"coordinates":[1,2]}` (entries that aren't `[lng, lat]` pairs).
**Cause:** `coordsToOsrmPath`/the elevation handler destructure each entry as `[lng, lat]` before any validation. A non-array entry (e.g. a bare number) throws a `TypeError` synchronously, and since Express 4 doesn't catch exceptions thrown inside `async` route handlers, the process crashes — taking the server down for every user, not just the bad request.
**Verified:** confirmed the process exit (`TypeError: number 1 is not iterable`) via direct testing before the fix.
**Fix:** added `isValidLngLatEntry` / `isValidLatLngEntry` validators (checking array shape, finite numbers, and lat/lng range) run over every entry before any destructuring, returning a `400` instead.

### 2. [High] Clicking a route line to highlight it doesn't work
**Where:** `public/js/alternatives.js`
**Repro:** With alternatives shown, click directly on a route polyline on the map.
**Cause:** The polyline's `click` handler called `selectRoute(route.id)`, but the click event then bubbled up to the map's own `click` listener. Since Start/End were already set, that handler's "third click" branch fired `selectRoute(null)` immediately after — undoing the selection in the same tick.
**Verified:** instrumented `selectRoute` and confirmed the call sequence `[0, null]` on a single click before the fix; `[0]` (stays selected) after.
**Fix:** call `L.DomEvent.stopPropagation(e)` in the polyline's click handler.

### 3. [Medium] Stale network responses can overwrite newer state (including after Clear)
**Where:** `public/js/route-planner.js`, `public/js/alternatives.js`, `public/js/elevation.js`
**Repro:** e.g. set Start/End in Alternatives (fetch in flight), then immediately click Clear. Or rapidly add waypoints, or rapidly toggle the elevation Walking/Cycling profile.
**Cause:** None of the three fetch-driven flows tracked which request was "current." An older, slower response arriving after a newer action (including Clear) would still run its `.then` logic and redraw/re-enable things that should have stayed cleared, or overwrite a newer result with stale data.
**Verified:** reproduced "routes reappear after Clear" and "profile toggle leaves stale chart" before the fix; confirmed both resolve correctly (empty state stays empty; final profile's data wins) after.
**Fix:** added a monotonically increasing request-id counter per feature, bumped on every state-changing action (including Clear); each fetch captures its id at the start and discards its result if the id no longer matches before touching the DOM.

### 4. [Low] Elevation Share button stays disabled if only the elevation lookup fails
**Where:** `public/js/elevation.js`
**Repro:** Set Start/End, simulate `/api/elevation` failing while `/api/route` succeeds.
**Cause:** The Share button was only enabled at the very end of the success path, after the elevation fetch — even though a share link only needs Start/End/profile (it recomputes everything on load), so a valid route with failed elevation data was still shareable but the button said otherwise.
**Verified:** confirmed `shareBtnDisabled: false` and a drawn route after simulating an elevation-fetch failure, post-fix.
**Fix:** enable the Share button right after the route fetch succeeds, independent of the elevation fetch's outcome.

### 5. [Low] Switching profile can leave a stale chart/route on failure
**Where:** `public/js/elevation.js`
**Repro:** Load a Walking route, then switch to Cycling where the new request fails.
**Cause:** The old route polyline and chart were only replaced on the *new* request's success path, so a failure left the previous profile's route/chart on screen next to an error message about the new profile.
**Fix:** clear the previous route, chart, and hover marker at the start of every fetch, before the new request is even sent (bundled with the fix for #3).

## Regression pass (post-fix)

All test cases T1–T15 re-run and passing:
- Backend: valid `/api/route` (driving + foot profiles), `/api/trip`, `/api/elevation` all return correct data; all four malformed-input cases now return `400` and the server survives.
- Frontend: planner add/drag/optimize/clear, alternatives select/highlight (now sticks), elevation profile switch + bidirectional hover-sync, and all three Share round-trips verified end-to-end in-browser.
- No console errors observed during any of the above.
