const express = require('express');
const router = express.Router();

const OSRM_BASE = 'https://router.project-osrm.org';
const MAX_ALTERNATIVE_ROUTES = 3;

function coordsToOsrmPath(coordinates) {
  return coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
}

function validateCoordinates(body, res) {
  const coordinates = body && body.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: 'coordinates must be an array with at least 2 [lng, lat] entries' });
    return null;
  }
  return coordinates;
}

// POST /api/route — used by Feature 2 (alternatives)
router.post('/route', async (req, res) => {
  const coordinates = validateCoordinates(req.body, res);
  if (!coordinates) return;

  const url = `${OSRM_BASE}/route/v1/driving/${coordsToOsrmPath(coordinates)}` +
    `?alternatives=true&overview=full&geometries=geojson`;

  try {
    const osrmRes = await fetch(url);
    if (!osrmRes.ok) {
      return res.status(502).json({ error: `OSRM route request failed with status ${osrmRes.status}` });
    }
    const data = await osrmRes.json();
    if (data.code !== 'Ok' || !Array.isArray(data.routes)) {
      return res.status(502).json({ error: data.message || 'OSRM returned no routes' });
    }

    const routes = data.routes.slice(0, MAX_ALTERNATIVE_ROUTES).map((route, id) => ({
      id,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry,
    }));

    res.json({ routes });
  } catch (err) {
    res.status(502).json({ error: 'Unable to reach OSRM routing engine' });
  }
});

// POST /api/trip — used by Feature 1 (multi-stop optimization)
router.post('/trip', async (req, res) => {
  const coordinates = validateCoordinates(req.body, res);
  if (!coordinates) return;

  const url = `${OSRM_BASE}/trip/v1/driving/${coordsToOsrmPath(coordinates)}` +
    `?source=first&roundtrip=false&overview=full&geometries=geojson`;

  try {
    const osrmRes = await fetch(url);
    if (!osrmRes.ok) {
      return res.status(502).json({ error: `OSRM trip request failed with status ${osrmRes.status}` });
    }
    const data = await osrmRes.json();
    if (data.code !== 'Ok' || !Array.isArray(data.trips) || data.trips.length === 0) {
      return res.status(502).json({ error: data.message || 'OSRM returned no trip' });
    }

    const trip = data.trips[0];
    // waypoints[] is in input-coordinate order; waypoint_index is each stop's
    // position in OSRM's chosen visiting order — forward it as-is so the
    // frontend can sort its list by this value.
    const optimizedOrder = data.waypoints.map((wp) => wp.waypoint_index);

    res.json({
      distanceMeters: trip.distance,
      durationSeconds: trip.duration,
      geometry: trip.geometry,
      optimizedOrder,
    });
  } catch (err) {
    res.status(502).json({ error: 'Unable to reach OSRM routing engine' });
  }
});

module.exports = router;
