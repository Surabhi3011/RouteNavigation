// Shared map state used by both features.

const map = L.map('map', { zoomControl: false }).setView([51.505, -0.09], 13); // London default view

// CARTO Positron — a free, no-key-required basemap with muted, minimal
// styling so the route lines/pins stand out against it (the stock OSM tile
// layer is far busier and doesn't read well behind the glass panel UI).
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 20,
  subdomains: 'abcd',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

// Default top-left zoom control would collide with the floating brand/tabs bar.
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Shared numbered/lettered pin marker used by all three tools, styled via the
// --pin-color CSS custom property (inherited from :root, so plain color
// tokens work without duplicating hex values here).
function createPinIcon(label, colorVar, size = 26) {
  return L.divIcon({
    className: 'map-pin',
    html: `<div class="map-pin-inner" style="--pin-color:${colorVar}; font-size:${size * 0.46}px;">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

let currentMode = 'planner';

const modeTabs = document.querySelectorAll('.mode-tab');
const plannerPanel = document.getElementById('planner-panel');
const alternativesPanel = document.getElementById('alternatives-panel');
const elevationPanel = document.getElementById('elevation-panel');

modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    currentMode = tab.dataset.mode;
    modeTabs.forEach((t) => t.classList.toggle('active', t === tab));
    plannerPanel.classList.toggle('hidden', currentMode !== 'planner');
    alternativesPanel.classList.toggle('hidden', currentMode !== 'alternatives');
    elevationPanel.classList.toggle('hidden', currentMode !== 'elevation');
  });
});

map.on('click', (e) => {
  if (currentMode === 'planner') {
    window.plannerOnMapClick(e.latlng);
  } else if (currentMode === 'alternatives') {
    window.alternativesOnMapClick(e.latlng);
  } else if (currentMode === 'elevation') {
    window.elevationOnMapClick(e.latlng);
  }
});
