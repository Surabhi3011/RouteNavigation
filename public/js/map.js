// Shared map state used by both features.

const map = L.map('map').setView([51.505, -0.09], 13); // London default view

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let currentMode = 'planner';

const modeTabs = document.querySelectorAll('.mode-tab');
const plannerPanel = document.getElementById('planner-panel');
const alternativesPanel = document.getElementById('alternatives-panel');

modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    currentMode = tab.dataset.mode;
    modeTabs.forEach((t) => t.classList.toggle('active', t === tab));
    plannerPanel.classList.toggle('hidden', currentMode !== 'planner');
    alternativesPanel.classList.toggle('hidden', currentMode !== 'alternatives');
  });
});

map.on('click', (e) => {
  if (currentMode === 'planner') {
    window.plannerOnMapClick(e.latlng);
  } else if (currentMode === 'alternatives') {
    window.alternativesOnMapClick(e.latlng);
  }
});
