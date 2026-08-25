# Route Navigator — Build Instructions

## What this is

A portfolio web app: custom route navigation similar to Google Maps, built entirely on
open-source tools in Node.js. Scope is deliberately tight — **total build budget is 5
hours** — so this file only covers two features. Do not add anything beyond what's
specified here without checking in; scope creep is the main risk to finishing on time.

**Feature 1 — Multi-stop route planner with reordering.** User drops 3–5 waypoints on
the map, sees them as an ordered list, can drag to reorder manually, and can click
"Optimize" to get the shortest visiting order back from the routing engine.

**Feature 2 — Route alternatives comparison.** User picks an origin and destination and
sees 2–3 alternative routes rendered simultaneously on the map in different colors, with
a side panel comparing distance and duration for each, and can click one to highlight it.

Both features share the same map, the same backend proxy, and the same OSM basemap — so
build the shared skeleton once, then layer each feature on top.

## Tech stack (all open source, no paid keys required)

- **Backend:** Node.js + Express. Acts as a thin proxy to the routing engine — never
  call the routing engine directly from the browser (keeps the backend swappable later
  and avoids CORS issues).
- **Routing engine:** OSRM public demo server at `https://router.project-osrm.org`. No
  API key, good enough for a portfolio demo. Note in the README that this is a shared
  public instance not meant for production traffic, and that self-hosting OSRM with a
  local `.osm.pbf` extract is the natural next step (don't build that in the 5-hour
  window — mention it as a "Future Work" bullet only).
- **Basemap tiles:** OpenStreetMap standard tile layer (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
  Respect OSM's tile usage policy — this is a low-traffic portfolio demo so it's fine,
  but say so in the README.
- **Frontend:** Plain HTML/CSS/vanilla JS + Leaflet.js. Do NOT set up React/Vite/a build
  step — for a 5-hour budget, a build pipeline is pure overhead. Leaflet is loaded via
  CDN `<script>`/`<link>` tags.
- **Drag-to-reorder:** SortableJS via CDN — do not hand-roll drag-and-drop.
- **HTTP client (backend → OSRM):** native `fetch` (Node 18+) — no axios needed.

## Project structure

```
route-nav-portfolio/
  server.js                # Express app entry point
  routes/
    routing.js              # /api/route and /api/trip handlers
  public/
    index.html
    css/style.css
    js/
      map.js                # Leaflet map init, tile layer, shared map state
      waypoints.js           # Feature 1: waypoint list UI + SortableJS wiring
      route-planner.js       # Feature 1: calls /api/trip, renders optimized route
      alternatives.js         # Feature 2: calls /api/route with alternatives, renders + compares
  package.json
  .env.example              # placeholder in case a routing API key is swapped in later
  README.md                 # setup + screenshots + "future work" section
```

Keep the two features in separate frontend JS files (`route-planner.js` vs
`alternatives.js`) even though they share `map.js` — this keeps each feature reviewable
and revertible on its own if time runs short.

## Backend API contract

Build exactly these two endpoints in `routes/routing.js`. Both are thin passthroughs to
OSRM with response shaping so the frontend doesn't need to know OSRM's response format.

### `POST /api/route` — used by Feature 2 (alternatives)

Request body:
```json
{ "coordinates": [[lng, lat], [lng, lat]] }
```

Calls OSRM's `route` service with `alternatives=true&overview=full&geometries=geojson`:
```
GET https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?alternatives=true&overview=full&geometries=geojson
```

Response shape returned to frontend:
```json
{
  "routes": [
    { "id": 0, "distanceMeters": 12345, "durationSeconds": 890, "geometry": { "type": "LineString", "coordinates": [...] } }
  ]
}
```
Cap at 3 routes even if OSRM returns more. If OSRM returns only 1 route (no alternative
exists for that pair), return it as a single-element array — the frontend should handle
a "no alternatives found" state gracefully, not error out.

### `POST /api/trip` — used by Feature 1 (multi-stop optimization)

Request body:
```json
{ "coordinates": [[lng, lat], [lng, lat], [lng, lat], ...] }
```

Calls OSRM's `trip` service (this is the OSRM endpoint that does the optimization —
don't reimplement TSP logic yourself):
```
GET https://router.project-osrm.org/trip/v1/driving/{lng1},{lat1};{lng2},{lat2};...?source=first&roundtrip=false&overview=full&geometries=geojson
```
`source=first` pins the trip to start at the first waypoint the user added (matches user
expectation — "optimize the order of my stops" shouldn't relocate the starting point).
`roundtrip=false` since this is a one-way trip planner, not a loop.

Response shape returned to frontend:
```json
{
  "distanceMeters": 20481,
  "durationSeconds": 1620,
  "geometry": { "type": "LineString", "coordinates": [...] },
  "optimizedOrder": [0, 2, 1, 3]
}
```
`optimizedOrder` is the index mapping from the input coordinates array to OSRM's chosen
visiting order (OSRM returns this per-waypoint in its `waypoints[].waypoint_index`
field — extract and forward it) so the frontend can re-sort its waypoint list to match.

Both endpoints: validate that `coordinates` has at least 2 entries (400 if not), wrap
the OSRM call in try/catch, and return a clean `{ "error": "..." }` with a 502 if OSRM is
unreachable or returns a non-OK status — a flaky public demo server going down mid-demo
is the single most likely failure mode, so this must not crash the server or hang the UI.

## Feature 1 — Multi-stop route planner (build this first, ~2–2.5 hrs)

1. Clicking the map adds a waypoint marker (numbered) and appends a row to a waypoint
   list panel (sidebar or bottom sheet). Support 2–5 waypoints; disable adding more past 5.
2. Each list row shows its number, a short label (reverse-geocoding is out of scope —
   just show "Stop 1", "Stop 2", etc., or lat/lng rounded to 4 decimals), and a drag
   handle. Wire SortableJS on the list so dragging a row reorders it.
3. Reordering the list immediately re-renders the route: call `/api/route` (not
   `/api/trip`) with the coordinates in the list's current manual order, and draw that
   as a single polyline. This is the "manual mode" path.
4. An "Optimize Order" button calls `/api/trip` with the current waypoints, then: (a)
   re-sorts the visible list to match `optimizedOrder`, (b) redraws the route from the
   trip response's geometry, (c) shows the resulting total distance/duration. This is
   the "optimized mode" path — after clicking it, the list reflects OSRM's chosen order,
   and further manual drags fall back to manual mode again on the next drag.
5. A "Clear" button removes all waypoints and the drawn route.

Acceptance check: add 4 waypoints out of visiting order, click Optimize, confirm the
list reorders and the drawn route visibly changes to the shorter path; then drag one
waypoint manually and confirm the route updates to match the new manual order.

## Feature 2 — Route alternatives comparison (build second, ~1.5–2 hrs)

1. Two click-to-set inputs: "Start" and "End" (click map once for each, or two search
   boxes — skip geocoding/search-by-address entirely if time is short; click-to-set pins
   is enough for a portfolio demo).
2. On both points being set, call `/api/route` and draw every returned route as a
   separate colored polyline (use 3 distinct, colorblind-safe colors — don't rely on
   red/green only). The first/primary route should be visually heavier (thicker line)
   than the alternates.
3. A side panel lists each route as a card: color swatch matching its line, distance
   (km), duration (min). Clicking a card highlights that route (bring to front, thicken
   it, dim the others) and clicking again (or clicking empty map space) resets to the
   default view showing all routes evenly.
4. Handle the "only 1 route returned" case with a small inline note ("No alternative
   route found for this pair") rather than an empty or broken panel.

Acceptance check: pick a start/end pair in a city with a highway and a surface-street
option nearby, confirm 2+ distinctly different-looking routes render, and confirm
clicking each card highlights the correct line on the map.

## Build order for the 5-hour budget

1. **Skeleton (~1.5 hrs):** Express server serving `public/`, Leaflet map with OSM tiles
   rendering in the browser, both API routes stubbed to return hardcoded sample JSON so
   the frontend can be built against a known shape before OSRM is wired in.
2. **Wire OSRM into both endpoints (~30 min):** replace the stubs with real OSRM calls,
   test each with `curl` before touching frontend code.
3. **Feature 1 (~2–2.5 hrs):** per the spec above.
4. **Feature 2 (~1.5–2 hrs):** per the spec above.
5. **Polish pass (last 30 min, cut ruthlessly if behind schedule):** loading spinners
   while waiting on OSRM, basic error toast if a request fails, a one-paragraph README
   with setup steps and a screenshot or two.

If running short on time, Feature 2 is the safer one to trim (e.g., ship it without
click-to-highlight, just the side-by-side cards) — Feature 1's optimize/reorder loop is
the more impressive portfolio piece and should stay intact.

## Explicitly out of scope (do not build, even if it seems quick)

- Address search / geocoding (Nominatim) — click-to-set pins only.
- User accounts, saved routes, or any persistence layer.
- Turn-by-turn navigation or live location tracking.
- Self-hosting OSRM or any Docker setup.
- Mobile-specific responsive polish beyond "doesn't visibly break" — desktop-first demo.

## Definition of done

- `npm install && npm start` runs the app with zero manual config on a clean checkout.
- Both features work end-to-end against the live OSRM demo server.
- README has: what it is, stack used, setup steps, 2–3 screenshots or a short GIF, and a
  "Future Work" section listing self-hosted OSRM, geocoding, and no-go-zone routing as
  next steps (ties back to the portfolio narrative without requiring you to build them).
