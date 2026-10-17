// Nagrywa /demo w widoku telefonu i zapisuje głos Sawy z API, z czasem startu każdego klipu.
// Wynik: public/capture/screen.webm, public/capture/clip-NN.mp3, public/capture/timeline.json
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL ?? "http://localhost:3100/demo?voice=1";
const RECORD_MS = Number(process.env.RECORD_MS ?? 100_000);
const OUT = "public/capture";
const VIEWPORT = { width: 393, height: 852 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/raw`, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "pl-PL",
  recordVideo: {
    dir: `${OUT}/raw`,
    size: { width: VIEWPORT.width * 2, height: VIEWPORT.height * 2 },
  },
});

const t0 = Date.now();
const clips = []; // { file, bytes, fetchedAt }
const stories = [];

// API nie wpuszcza localhost (CORS), więc zapytania idą przez Node z dopisanym nagłówkiem.
await context.route(/railway\.app/, async (route) => {
  const res = await route.fetch();
  const path = new URL(route.request().url()).pathname;
  const body = await res.body();
  if (path === "/v1/stories/audio" && res.ok()) {
    const file = `clip-${String(clips.length).padStart(2, "0")}.mp3`;
    writeFileSync(join(OUT, file), body);
    clips.push({ file, bytes: body.length, fetchedAt: Date.now() - t0 });
  } else if (path === "/v1/stories" && res.ok()) {
    stories.push(JSON.parse(body.toString()));
  } else if (!res.ok()) {
    console.warn(`${res.status()} ${path}: ${body.toString().slice(0, 160)}`);
  }
  await route.fulfill({
    response: res,
    body,
    headers: { ...res.headers(), "access-control-allow-origin": "*" },
  });
});

// Każde odtworzenie klipu zapisujemy z rozmiarem blobu, żeby dopasować je do pliku mp3.
await context.addInitScript(() => {
  const sizes = new Map();
  const create = URL.createObjectURL;
  URL.createObjectURL = (obj) => {
    const url = create.call(URL, obj);
    if (obj instanceof Blob) sizes.set(url, obj.size);
    return url;
  };
  window.__plays = [];
  // `new Audio()` nie leży w dokumencie, więc słuchamy na samym elemencie.
  const watched = new WeakSet();
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    if (!watched.has(this)) {
      watched.add(this);
      this.addEventListener("playing", () =>
        window.__plays.push({
          src: this.currentSrc,
          bytes: sizes.get(this.currentSrc) ?? null,
          at: Date.now(),
          offset: this.currentTime,
        }),
      );
      this.addEventListener("pause", () =>
        window.__plays.push({ src: this.currentSrc, pausedAt: Date.now() }),
      );
    }
    return play.apply(this, args);
  };
});

const page = await context.newPage();
await page.goto(APP_URL);
// Badż Next.js w trybie dev nie idzie na film.
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.waitForTimeout(RECORD_MS);

const plays = await page.evaluate(() => window.__plays);
await context.close();
await browser.close();

const [video] = readdirSync(`${OUT}/raw`);
renameSync(join(OUT, "raw", video), join(OUT, "screen.webm"));
rmSync(`${OUT}/raw`, { recursive: true });

const timeline = plays
  .filter((p) => p.at)
  .map((p) => {
    const clip = clips.find((c) => c.bytes === p.bytes);
    return { file: clip?.file ?? null, startSec: (p.at - t0) / 1000, offsetSec: p.offset };
  })
  .filter((p) => p.file);
const pauses = plays.filter((p) => p.pausedAt).map((p) => (p.pausedAt - t0) / 1000);

writeFileSync(
  join(OUT, "timeline.json"),
  JSON.stringify(
    {
      recordSec: RECORD_MS / 1000,
      timeline,
      pauses,
      clips,
      stories: stories.map((s) => ({ placeId: s.placeId, text: s.text })),
    },
    null,
    2,
  ),
);
console.log(`klipy: ${clips.length}, odtworzenia: ${timeline.length}`);
console.log(timeline);
