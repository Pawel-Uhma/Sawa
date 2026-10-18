// Ikony makiet 0100-szukaj-*. Elementy z data-i="nazwa" dostają SVG na początku.
const IK = {
  szukaj: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  mikrofon: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  pieszo: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M7 12l3-3 4 1 2 3h3"/><path d="m10 9-1 5"/>',
  tramwaj: '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4M9 1h6M12 1v3"/>',
  petla: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  cel: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  zegar: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dol: '<path d="m6 9 6 6 6-6"/>',
  lok: '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>',
  warstwy: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  kamienica: '<path d="M4 21V8l8-5 8 5v13H4Z"/><path d="M9 21v-5h6v5M8 11h2M14 11h2"/>',
  pomnik: '<path d="M9 21h6M10 21V11h4v10M12 11V7"/><circle cx="12" cy="5" r="2"/><path d="M6 21h12"/>',
  mural: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
  historia: '<path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2Zm0 0a2 2 0 0 1 2-2h12"/>',
  odkrywaj: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  przejazdzki: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  zegarek: '<path d="M12 8v4l2 2"/><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  gwiazda: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  graj: '<path d="M7 4v16l13-8L7 4Z" fill="currentColor"/>',
  wstecz: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  zamien: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  kropka: '<circle cx="12" cy="12" r="5"/>',
  suwaki: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  strzalka: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const ik = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[n]}</svg>`;
document.querySelectorAll('[data-i]').forEach((el) => el.insertAdjacentHTML('afterbegin', ik(el.dataset.i)));
document.querySelectorAll('[data-po]').forEach((el) => el.insertAdjacentHTML('beforeend', ik(el.dataset.po)));
