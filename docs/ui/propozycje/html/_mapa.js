// Mapa w barwach Sawy: OpenFreeMap (positron) przekolorowany na Głębię i Miętę.
const JA = [20.9790, 52.2359]; // al. Solidarności 171, 42 Warsaw

const KOLORY = {
  jasna: {
    tlo: '#EEF3F0', park: '#D6EEE2', woda: '#B9E2D3', osiedle: '#E9EEEB', budynek: '#E1E8E4', obrys: '#D7DFDB',
    droga: '#FFFFFF', drogaMala: '#FAFCFB', obwiednia: '#D9E1DD', tory: '#CFD8D4', tekst: '#5B706D', halo: '#EEF3F0',
  },
  noc: {
    tlo: '#0C2423', park: '#10342F', woda: '#0B4442', osiedle: '#0E2927', budynek: '#12302E', obrys: '#163A37',
    droga: '#1E4744', drogaMala: '#163936', obwiednia: '#0C2423', tory: '#1B403D', tekst: '#6F9A94', halo: '#0C2423',
  },
};

function przekoloruj(m, noc) {
  const k = noc ? KOLORY.noc : KOLORY.jasna;
  for (const l of m.getStyle().layers) {
    const id = l.id, t = l.type;
    const set = (p, v) => { try { m.setPaintProperty(id, p, v); } catch (e) {} };
    if (t === 'background') set('background-color', k.tlo);
    else if (id === 'park' || id.includes('wood')) set('fill-color', k.park);
    else if (id === 'water') set('fill-color', k.woda);
    else if (id === 'waterway') set('line-color', k.woda);
    else if (id.includes('residential')) set('fill-color', k.osiedle);
    else if (id === 'building') { set('fill-color', k.budynek); set('fill-outline-color', k.obrys); }
    else if (id.includes('casing')) set('line-color', k.obwiednia);
    else if (id.includes('minor') || id.includes('path')) set('line-color', k.drogaMala);
    else if (id.startsWith('highway') || id.startsWith('tunnel')) set('line-color', k.droga);
    else if (id.startsWith('railway')) set('line-color', id.includes('dash') ? k.tlo : k.tory);
    else if (id.startsWith('boundary')) m.setLayoutProperty(id, 'visibility', 'none');
    else if (t === 'symbol') { set('text-color', k.tekst); set('text-halo-color', k.halo); }
  }
}

function granice(c) {
  const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

// Środek mapy przesunięty tak, żeby punkt wypadł dy pikseli nad środkiem ekranu
function nad(punkt, dy, zoom) {
  const mNaPx = 156543.03 * Math.cos(punkt[1] * Math.PI / 180) / Math.pow(2, zoom);
  return [punkt[0], punkt[1] - (dy * mNaPx) / 111200];
}

function okrag(srodek, km, n = 96) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    pts.push([srodek[0] + (km / (111.32 * Math.cos(srodek[1] * Math.PI / 180))) * Math.cos(a), srodek[1] + (km / 110.57) * Math.sin(a)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
}

// o: { center, zoom, noc, trasa: 'wola'|..., kolorTrasy, miejsca: true, zasiegKm, ja: true, pins: [{c, n, nr}] }
function sawaMapa(el, o = {}) {
  const m = new maplibregl.Map({
    container: el, style: 'https://tiles.openfreemap.org/styles/positron',
    center: o.center || JA, zoom: o.zoom ?? 14,
    ...(o.dopasuj ? { bounds: granice(SAWA[o.trasa]), fitBoundsOptions: { padding: o.dopasuj } } : {}), bearing: o.bearing || 0, pitch: o.pitch || 0,
    attributionControl: false, interactive: false, preserveDrawingBuffer: true, fadeDuration: 0,
  });
  m.on('load', () => {
    przekoloruj(m, o.noc);
    if (o.zasiegKm) {
      m.addSource('zasieg', { type: 'geojson', data: okrag(JA, o.zasiegKm) });
      m.addLayer({ id: 'zasieg-fill', type: 'fill', source: 'zasieg', paint: { 'fill-color': '#17706F', 'fill-opacity': .10 } });
      m.addLayer({ id: 'zasieg-line', type: 'line', source: 'zasieg', paint: { 'line-color': '#17706F', 'line-width': 2, 'line-dasharray': [2, 2] } });
    }
    if (o.miejsca) {
      const fc = { type: 'FeatureCollection', features: SAWA.miejsca.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p.c } })) };
      m.addSource('miejsca', { type: 'geojson', data: fc });
      m.addLayer({ id: 'miejsca', type: 'circle', source: 'miejsca', paint: {
        'circle-radius': o.miejscaR || 4, 'circle-color': '#F2755F', 'circle-opacity': .85,
        'circle-stroke-color': o.noc ? '#0C2423' : '#fff', 'circle-stroke-width': 1.5 } });
    }
    if (o.trasa) {
      const kolor = o.kolorTrasy || (o.noc ? '#8ED1B5' : '#17706F');
      m.addSource('trasa', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: SAWA[o.trasa] } } });
      m.addLayer({ id: 'trasa-obw', type: 'line', source: 'trasa', layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': o.noc ? '#0C2423' : '#fff', 'line-width': (o.gruboscTrasy || 5) + 4 } });
      m.addLayer({ id: 'trasa', type: 'line', source: 'trasa', layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': kolor, 'line-width': o.gruboscTrasy || 5 } });
    }
  });
  if (o.ja !== false) {
    const d = document.createElement('div'); d.className = 'ja' + (o.noc ? ' noc' : '');
    new maplibregl.Marker({ element: d }).setLngLat(JA).addTo(m);
  }
  for (const p of o.pins || []) {
    const d = document.createElement('div'); d.className = 'pin'; d.innerHTML = p.prawo ? `${p.n}<b></b>` : `<b></b>${p.n}`;
    if (p.prawo) d.style.padding = '4px 4px 4px 10px';
    new maplibregl.Marker({ element: d, anchor: p.prawo ? 'right' : 'left', offset: [p.prawo ? 15 : -15, 0] }).setLngLat(p.c).addTo(m);
  }
  return m;
}
