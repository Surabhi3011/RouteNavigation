# Route Navigator

A portfolio route-navigation web app built on open-source tools: multi-stop route
planning with drag-to-reorder and one-click TSP optimization, plus side-by-side
comparison of alternative routes between two points.

## Features

**Multi-stop route planner** — click the map to drop 2–5 waypoints, drag to reorder
them manually (route redraws live), or click "Optimize Order" to let the routing
engine pick the shortest visiting order, starting from your first stop.

**Route alternatives comparison** — click a start and end point and see up to 3
alternative routes rendered simultaneously in distinct colors, with a side panel
comparing distance and duration for each. Click a route card to highlight that route
on the map.

## Stack

- **Backend:** Node.js + Express, acting as a thin proxy to the routing engine (keeps
  the browser from calling OSRM directly, avoiding CORS issues and keeping the backend
  swappable later).
- **Routing engine:** [OSRM](http://project-osrm.org/) public demo server
  (`https://router.project-osrm.org`). This is a **shared public instance not meant for
  production traffic** — fine for a low-volume portfolio demo, but self-hosting OSRM
  with a local `.osm.pbf` extract would be the natural next step for real usage.
- **Basemap tiles:** OpenStreetMap standard tile layer. This app is low-traffic and
  respects [OSM's tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
- **Frontend:** Plain HTML/CSS/vanilla JS + [Leaflet.js](https://leafletjs.com/) (via
  CDN, no build step).
- **Drag-to-reorder:** [SortableJS](https://sortablejs.github.io/Sortable/) (via CDN).

## Setup

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000). No API keys or environment
configuration are required — `.env.example` is a placeholder for a future paid routing
provider only.

## Usage

- **Multi-Stop Planner tab:** click the map to add stops (up to 5). Drag rows in the
  list to reorder — the route redraws after each drag. Click "Optimize Order" to
  re-sort the stops into OSRM's shortest visiting order. "Clear" removes all stops.
- **Route Alternatives tab:** click once to set the start point, click again to set the
  end point. Up to 3 alternative routes render in different colors; click a card in the
  side panel to highlight that route on the map (click again, or an empty card slot, to
  reset). If OSRM has only one route for a given pair, the panel says so instead of
  showing an empty state.

## Screenshots

_Add 2–3 screenshots or a short GIF here showing the planner in manual mode, the
planner after optimizing, and the alternatives comparison view._

## Future Work

- Self-host OSRM with a local `.osm.pbf` extract instead of relying on the shared
  public demo server, for reliability and production-readiness.
- Address search / geocoding (e.g. via Nominatim) instead of click-to-set pins.
- No-go-zone routing — let users mark areas to avoid and route around them.
