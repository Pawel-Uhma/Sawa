// Znaczniki miejsc, wariant I „Naklejka” (Paweł, 17.10, 18:05; docs/ui/propozycje/html/ikony-znaczniki-3.html):
// pełny glif z obwódką i cieniem, bez tła, jeden kształt na podrodzaj (`places.subkind`, PLACE_SUBKINDS w packages/shared).
// Od T-151 (#102) kolor glifu to kolor TEMATU miejsca, a aplikacja rysuje naklejki sama w przeglądarce
// (apps/web/src/features/map/lib/place-stickers.ts) z tych samych ścieżek: apps/web/src/features/map/lib/place-glyphs.json.
// Ten skrypt robi tylko podgląd kształtów: SVG w docs/ui/ikony-mapy/znaczniki/ i arkusz.html, glify w neutralnym kolorze.
// Uruchom z katalogu repo: node docs/ui/ikony-mapy/znaczniki.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SVG_DIR = "docs/ui/ikony-mapy/znaczniki";
const GLIFY = JSON.parse(readFileSync("apps/web/src/features/map/lib/place-glyphs.json", "utf8"));
const PX = 96;
const TUSZ = "#1f2a29";

// Grupy tylko porządkują arkusz; kolorów grup już nie ma (kolor = temat).
const GRUPY = {
  mieszkac: { nazwa: "Mieszkać" },
  instytucje: { nazwa: "Instytucje" },
  kultura: { nazwa: "Kultura" },
  praca: { nazwa: "Praca i transport" },
  pamiec: { nazwa: "Wojna i pamięć" },
  sacrum: { nazwa: "Sacrum" },
  natura: { nazwa: "Natura i ruch" },
  inne: { nazwa: "Inne" },
};

// Glify 24 × 24 (place-glyphs.json), fill-rule evenodd: zagnieżdżony kształt wycina otwór (okna, drzwi).
const ZNACZNIKI = {
  tenement: {
    grupa: "mieszkac",
    nazwa: "kamienica",
  },
  building: {
    grupa: "mieszkac",
    nazwa: "budynek",
  },
  palace: {
    grupa: "mieszkac",
    nazwa: "pałac",
  },
  manor: {
    grupa: "mieszkac",
    nazwa: "dwór, willa",
  },
  housing: {
    grupa: "mieszkac",
    nazwa: "blok, osiedle",
  },
  street: {
    grupa: "mieszkac",
    nazwa: "ulica, plac",
  },
  school: {
    grupa: "instytucje",
    nazwa: "szkoła",
  },
  university: {
    grupa: "instytucje",
    nazwa: "uczelnia",
  },
  hospital: {
    grupa: "instytucje",
    nazwa: "szpital",
  },
  office: {
    grupa: "instytucje",
    nazwa: "urząd, sąd",
  },
  trade: {
    grupa: "instytucje",
    nazwa: "handel, hotel, bank",
  },
  museum: {
    grupa: "kultura",
    nazwa: "muzeum, galeria",
  },
  theatre: {
    grupa: "kultura",
    nazwa: "teatr, scena",
  },
  cinema: {
    grupa: "kultura",
    nazwa: "kino",
  },
  library: {
    grupa: "kultura",
    nazwa: "biblioteka",
  },
  mural: {
    grupa: "kultura",
    nazwa: "mural",
  },
  factory: {
    grupa: "praca",
    nazwa: "fabryka",
  },
  station: {
    grupa: "praca",
    nazwa: "dworzec, metro",
  },
  bridge: {
    grupa: "praca",
    nazwa: "most",
  },
  monument: {
    grupa: "pamiec",
    nazwa: "pomnik",
  },
  plaque: {
    grupa: "pamiec",
    nazwa: "tablica",
  },
  fortress: {
    grupa: "pamiec",
    nazwa: "fort, koszary",
  },
  prison: {
    grupa: "pamiec",
    nazwa: "więzienie, getto",
  },
  event: {
    grupa: "pamiec",
    nazwa: "wydarzenie",
  },
  church: {
    grupa: "sacrum",
    nazwa: "kościół",
  },
  chapel: {
    grupa: "sacrum",
    nazwa: "kapliczka",
  },
  orthodox: {
    grupa: "sacrum",
    nazwa: "cerkiew",
  },
  synagogue: {
    grupa: "sacrum",
    nazwa: "synagoga",
  },
  cemetery: {
    grupa: "sacrum",
    nazwa: "cmentarz",
  },
  park: {
    grupa: "natura",
    nazwa: "park, skwer",
  },
  garden: {
    grupa: "natura",
    nazwa: "ogród",
  },
  water: {
    grupa: "natura",
    nazwa: "woda",
  },
  pitch: {
    grupa: "natura",
    nazwa: "boisko",
  },
  stadium: {
    grupa: "natura",
    nazwa: "stadion, hala, basen",
  },
  site: {
    grupa: "inne",
    nazwa: "miejsce",
  },
};

// Glif 24 px w polu 40: skala 1,12, obwódka 3,2 jednostki rysowana pod wypełnieniem
const svg = ({ kolor, g }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}" viewBox="0 0 40 40">
  <defs><filter id="c" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="#102B2A" flood-opacity=".3"/></filter></defs>
  <g filter="url(#c)"><g transform="translate(6.5 5.5) scale(1.12)"><path d="${g}" fill="${kolor}" fill-rule="evenodd" stroke="#fff" stroke-width="${(3.2 / 1.12).toFixed(3)}" stroke-linejoin="round" paint-order="stroke"/></g></g>
</svg>
`;

mkdirSync(SVG_DIR, { recursive: true });
const kafle = [];
for (const [rodzaj, { grupa, nazwa }] of Object.entries(ZNACZNIKI)) {
  const kod = svg({ kolor: TUSZ, g: GLIFY[rodzaj] });
  writeFileSync(join(SVG_DIR, `${rodzaj}.svg`), kod);
  kafle.push({ grupa, nazwa, rodzaj, kod });
}

// Arkusz: każda grupa w wierszu, na jasnym i na ciemnym tle. Id filtra cienia unikalne na stronie.
const naArkusz = (k, i) =>
  k.kod.replace('width="96" height="96"', 'width="48" height="48"').replaceAll('"c"', `"c${i}"`).replace("url(#c)", `url(#c${i})`);
const wiersze = (od) =>
  Object.entries(GRUPY)
    .map(([klucz, { nazwa }]) => {
      const w = kafle.filter((k) => k.grupa === klucz);
      return `<section><h2>${nazwa}</h2><div class="r">${w
        .map((k) => `<figure>${naArkusz(k, od + kafle.indexOf(k))}<figcaption>${k.nazwa}<code>${k.rodzaj}</code></figcaption></figure>`)
        .join("")}</div></section>`;
    })
    .join("");
writeFileSync(
  join(SVG_DIR, "arkusz.html"),
  `<!doctype html><meta charset="utf-8"><title>Znaczniki miejsc</title>
<style>body{font:14px system-ui;margin:24px;background:#f4f1ea;color:#1f2a29}h1{font-size:18px}h2{font-size:14px;margin:14px 0 6px}
.r{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:104px;text-align:center;padding:8px 0;border-radius:12px;background:#fff}
figcaption{font-size:12px}code{display:block;color:#6b7280;font-size:11px}
.ciemny{background:#0e1615;color:#e6efed;padding:4px 16px 16px;margin-top:24px;border-radius:16px}.ciemny figure{background:#1b2827}</style>
<h1>Znaczniki miejsc: ${kafle.length}</h1>${wiersze(0)}<div class="ciemny">${wiersze(1000)}</div>`,
);
console.log(`${kafle.length} znaczników, arkusz w ${SVG_DIR}/arkusz.html`);
