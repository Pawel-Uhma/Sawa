// Nagrywa /demo w widoku telefonu i zapisuje głos Sawy z API, z czasem startu każdego klipu.
// Wynik: public/capture/screen.mp4, public/capture/clip-NN.mp3, public/capture/timeline.json
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL ?? "http://localhost:3100/demo?voice=1";
const RECORD_MS = Number(process.env.RECORD_MS ?? 100_000);
const OUT = "public/capture";
const VIEWPORT = { width: 393, height: 852 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/frames`, { recursive: true });

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
});

const t0 = Date.now();
const clips = []; // { file, bytes, fetchedAt }
const stories = [];

// API nie wpuszcza localhost (CORS), więc zapytania idą przez Node z dopisanym nagłówkiem.
// Głos z ElevenLabs kosztuje kredyty, więc każdy klip trzymamy w audio-cache/ po treści zapytania.
mkdirSync("audio-cache", { recursive: true });
await context.route(/railway\.app/, async (route) => {
  const path = new URL(route.request().url()).pathname;
  const cacheFile = `audio-cache/${createHash("sha1")
    .update(route.request().postData() ?? "")
    .digest("hex")}.mp3`;
  if (path === "/v1/stories/audio" && existsSync(cacheFile)) {
    const body = readFileSync(cacheFile);
    const file = `clip-${String(clips.length).padStart(2, "0")}.mp3`;
    writeFileSync(join(OUT, file), body);
    clips.push({ file, bytes: body.length, fetchedAt: Date.now() - t0 });
    return route.fulfill({
      status: 200,
      body,
      headers: { "content-type": "audio/mpeg", "access-control-allow-origin": "*" },
    });
  }
  const res = await route.fetch();
  const body = await res.body();
  if (path === "/v1/stories/audio" && res.ok()) writeFileSync(cacheFile, body);
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
// Klatki z CDP screencast (ffmpeg Playwrighta nie działa na tym Macu), potem składa je systemowy ffmpeg.
const frames = []; // { file, at }
const cdp = await context.newCDPSession(page);
cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
  const file = `f${String(frames.length).padStart(5, "0")}.jpg`;
  writeFileSync(join(OUT, "frames", file), Buffer.from(data, "base64"));
  frames.push({ file, at: Date.now() - t0 });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 92,
  maxWidth: VIEWPORT.width * 2,
  maxHeight: VIEWPORT.height * 2,
});
await page.goto(APP_URL);
// Badż Next.js w trybie dev nie idzie na film.
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.waitForTimeout(RECORD_MS);

const plays = await page.evaluate(() => window.__plays);
await context.close();
await browser.close();

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

// Klatki przychodzą tylko przy zmianie obrazu, więc każda trwa do następnej (concat z czasami).
const list = frames.map((f, i) => {
  const until = frames[i + 1]?.at ?? RECORD_MS;
  return `file 'frames/${f.file}'\nduration ${((until - f.at) / 1000).toFixed(3)}`;
});
writeFileSync(join(OUT, "frames.txt"), `${list.join("\n")}\nfile 'frames/${frames.at(-1).file}'\n`);
// Pierwsza klatka przychodzi po starcie, więc wideo przesuwamy o jej czas (tpad), żeby t=0 było t0.
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  join(OUT, "frames.txt"),
  "-vf",
  `tpad=start_duration=${frames[0].at / 1000}:start_mode=clone,fps=30,scale=786:1704:flags=lanczos,format=yuv420p`,
  "-c:v",
  "libx264",
  "-crf",
  "16",
  "-preset",
  "slow",
  join(OUT, "screen.mp4"),
]);
rmSync(join(OUT, "frames"), { recursive: true });
