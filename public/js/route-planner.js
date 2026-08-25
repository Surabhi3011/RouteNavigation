// Feature 1: calls /api/route (manual mode) and /api/trip (optimize), renders route.

let plannerPolyline = null;
const optimizeBtnEl = document.getElementById('optimize-btn');
const plannerSummaryEl = document.getElementById('planner-summary');
const plannerStatusEl2 = document.getElementById('planner-status');

function drawPlannerRoute(coordinates) {
  if (plannerPolyline) {
    map.removeLayer(plannerPolyline);
    plannerPolyline = null;
  }
  const latlngs = coordinates.map(([lng, lat]) => [lat, lng]);
  plannerPolyline = L.polyline(latlngs, { color: '#2563eb', weight: 5 }).addTo(map);
}

function formatSummary(distanceMeters, durationSeconds) {
  const km = (distanceMeters / 1000).toFixed(1);
  const min = Math.round(durationSeconds / 60);
  return `${km} km &middot; ${min} min`;
}

async function updateManualRoute() {
  plannerStatusEl2.textContent = '';
  if (Planner.waypoints.length < MIN_WAYPOINTS) {
    if (plannerPolyline) {
      map.removeLayer(plannerPolyline);
      plannerPolyline = null;
    }
    plannerSummaryEl.textContent = '';
    return;
  }

  const coordinates = Planner.waypoints.map((wp) => [wp.lng, wp.lat]);
  try {
    const res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    });
    const data = await res.json();
    if (!res.ok) {
      plannerStatusEl2.textContent = data.error || 'Failed to fetch route.';
      return;
    }
    const primary = data.routes[0];
    drawPlannerRoute(primary.geometry.coordinates);
    plannerSummaryEl.innerHTML = formatSummary(primary.distanceMeters, primary.durationSeconds);
  } catch (err) {
    plannerStatusEl2.textContent = 'Could not reach the server.';
  }
}

async function optimizeOrder() {
  if (Planner.waypoints.length < MIN_WAYPOINTS) return;
  plannerStatusEl2.textContent = '';
  optimizeBtnEl.disabled = true;

  const coordinates = Planner.waypoints.map((wp) => [wp.lng, wp.lat]);
  try {
    const res = await fetch('/api/trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    });
    const data = await res.json();
    if (!res.ok) {
      plannerStatusEl2.textContent = data.error || 'Failed to optimize order.';
      return;
    }

    // optimizedOrder[i] = visiting position of the i-th input waypoint.
    const reordered = Planner.waypoints
      .map((wp, i) => ({ wp, position: data.optimizedOrder[i] }))
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.wp);

    Planner.waypoints = reordered;
    Planner.mode = 'optimized';
    renumberMarkers();
    renderWaypointList();
    drawPlannerRoute(data.geometry.coordinates);
    plannerSummaryEl.innerHTML = formatSummary(data.distanceMeters, data.durationSeconds);
  } catch (err) {
    plannerStatusEl2.textContent = 'Could not reach the server.';
  } finally {
    optimizeBtnEl.disabled = Planner.waypoints.length < MIN_WAYPOINTS;
  }
}

Planner.onWaypointsChanged = updateManualRoute;
optimizeBtnEl.addEventListener('click', optimizeOrder);
