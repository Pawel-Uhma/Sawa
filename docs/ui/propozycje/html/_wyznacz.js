// Ikony i pasek zakładek dla makiet 1900-wyznacz-*. Elementy z data-ikona="nazwa" dostają SVG.
const IKONY = {
  pieszo: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M7 12l3-3 4 1 2 3h3"/><path d="m10 9-1 5"/>',
  tramwaj: '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4M9 1h6M12 1v3"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
  petla: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  cel: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  szukaj: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  strzalka: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  edytuj: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  mapa: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  przejazdzki: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  suwaki: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
const ikona = (n, s = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round">${IKONY[n]}</svg>`;
document.querySelectorAll('[data-ikona]').forEach(el => el.insertAdjacentHTML('afterbegin', ikona(el.dataset.ikona)));
document.querySelectorAll('.zakladki').forEach(el => {
  el.innerHTML = `<div class="aktywna">${ikona('mapa')}Mapa</div>
    <div class="srodek"><img class="awatar" src="../../../pitch/img/ikona-sawa.jpg"></div>
    <div>${ikona('przejazdzki')}Przejażdżki</div>`;
});
