// Feature 5: encode route state into a shareable URL, and restore it on load.

function base64UrlEncode(obj) {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const json = decodeURIComponent(escape(atob(padded)));
  return JSON.parse(json);
}

function buildShareUrl(payload) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('s', base64UrlEncode(payload));
  return url.toString();
}

function showShareBox(boxEl, url) {
  boxEl.classList.remove('hidden');
  boxEl.innerHTML = '<input type="text" readonly /><button class="copy-share-btn">Copy</button>';
  const input = boxEl.querySelector('input');
  input.value = url;
  boxEl.querySelector('.copy-share-btn').addEventListener('click', () => {
    input.select();
    navigator.clipboard.writeText(url).catch(() => {});
  });
}

document.getElementById('share-planner-btn').addEventListener('click', () => {
  const payload = { mode: 'planner', points: Planner.waypoints.map((wp) => [wp.lat, wp.lng]) };
  showShareBox(document.getElementById('planner-share-box'), buildShareUrl(payload));
});

document.getElementById('share-alternatives-btn').addEventListener('click', () => {
  const payload = {
    mode: 'alternatives',
    start: [Alternatives.start.lat, Alternatives.start.lng],
    end: [Alternatives.end.lat, Alternatives.end.lng],
  };
  showShareBox(document.getElementById('alternatives-share-box'), buildShareUrl(payload));
});

document.getElementById('share-elevation-btn').addEventListener('click', () => {
  const profile = document.querySelector('input[name="elevation-profile"]:checked').value;
  const payload = {
    mode: 'elevation',
    start: [Elevation.start.lat, Elevation.start.lng],
    end: [Elevation.end.lat, Elevation.end.lng],
    profile,
  };
  showShareBox(document.getElementById('elevation-share-box'), buildShareUrl(payload));
});

function restoreFromShareLink() {
  const encoded = new URLSearchParams(window.location.search).get('s');
  if (!encoded) return;

  let payload;
  try {
    payload = base64UrlDecode(encoded);
  } catch (err) {
    return;
  }

  const tab = document.querySelector(`.mode-tab[data-mode="${payload.mode}"]`);
  if (tab) tab.click();

  if (payload.mode === 'planner' && Array.isArray(payload.points)) {
    payload.points.forEach(([lat, lng]) => window.plannerOnMapClick(L.latLng(lat, lng)));
  } else if (payload.mode === 'alternatives' && payload.start && payload.end) {
    window.alternativesOnMapClick(L.latLng(payload.start[0], payload.start[1]));
    window.alternativesOnMapClick(L.latLng(payload.end[0], payload.end[1]));
  } else if (payload.mode === 'elevation' && payload.start && payload.end) {
    const radio = document.querySelector(`input[name="elevation-profile"][value="${payload.profile}"]`);
    if (radio) radio.checked = true;
    window.elevationOnMapClick(L.latLng(payload.start[0], payload.start[1]));
    window.elevationOnMapClick(L.latLng(payload.end[0], payload.end[1]));
  }
}

restoreFromShareLink();
