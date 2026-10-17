// Z nagrania (public/capture/timeline.json) robi montaż: wycinki ekranu, głos i napisy zdań Sawy.
// Wynik: src/cues.json. Czasy w sekundach osi filmu (bez intro).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const capture = JSON.parse(readFileSync("public/capture/timeline.json", "utf8"));
const durationOf = (file) =>
  Number(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      `public/capture/${file}`,
    ]).toString(),
  );

// Który klip to która opowieść: kolejność odtworzeń = kolejność miejsc na trasie.
const plays = capture.timeline.map((p, i) => ({
  ...p,
  story: capture.stories[i],
  duration: durationOf(p.file),
}));
const byPlace = (id) => plays.find((p) => p.story?.placeId === id);

/** Zdania z czasem proporcjonalnym do liczby znaków (ElevenLabs czyta równo). */
function sentences(text, duration) {
  // Literówka z LLM („osiemst”) tylko w napisie; głos zostaje bez zmian.
  text = text.replace("osiemst ", "osiemset ");
  const parts = text
    .match(/[^.!?]+[.!?]*/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const total = parts.reduce((n, s) => n + s.length, 0);
  let at = 0;
  return parts.map((s) => {
    const len = (s.length / total) * duration;
    const cue = { text: s, fromSec: at, toSec: at + len };
    at += len;
    return cue;
  });
}

/**
 * Plan montażu: [od, do] w sekundach nagrania, opcjonalnie opowieść do napisów i nagłówek.
 * Leszno kończymy przed zdaniem z błędnie przeczytanym rokiem („tysiąc dziewięćdziesiątego dziewiątego”).
 */
const leszno = byPlace("leszno");
const kercelak = byPlace("kercelak");
const lesznoSentences = sentences(leszno.story.text, leszno.duration);
const lesznoCut = lesznoSentences.findIndex((s) => s.text.startsWith("Niestety"));
const lesznoEnd = leszno.startSec + lesznoSentences[lesznoCut].fromSec - 0.15;

const plan = [
  {
    from: 3.4,
    to: leszno.startSec,
    kicker: "Start: 42 Warsaw, al. Solidarności",
    text: "Sawa układa przejazd tramwajem pod Twój czas i zainteresowania.",
  },
  {
    from: leszno.startSec,
    to: lesznoEnd,
    play: leszno,
    kicker: "Teraz za oknem · Leszno",
    sentences: lesznoSentences.slice(0, lesznoCut),
  },
  {
    from: kercelak.startSec - 0.4,
    to: kercelak.startSec + kercelak.duration + 1.2,
    play: kercelak,
    kicker: "150 m od tej sali · Kercelak",
    sentences: sentences(kercelak.story.text, kercelak.duration),
  },
];

let out = 0;
const segments = plan.map((p) => {
  const seg = {
    atSec: out,
    srcFromSec: p.from,
    durationSec: p.to - p.from,
    kicker: p.kicker,
    text: p.text ?? null,
    audio: p.play
      ? {
          file: p.play.file,
          atSec: out + (p.play.startSec - p.from),
          durationSec: p.to - p.play.startSec,
        }
      : null,
    subtitles: (p.sentences ?? []).map((s) => ({
      text: s.text,
      fromSec: out + (p.play.startSec - p.from) + s.fromSec,
      toSec: out + (p.play.startSec - p.from) + s.toSec,
    })),
  };
  out += seg.durationSec;
  return seg;
});

writeFileSync("src/cues.json", JSON.stringify({ screenSec: out, segments }, null, 2));
console.log(
  `ekran ${out.toFixed(1)} s`,
  segments.map((s) => `${s.kicker}: ${s.durationSec.toFixed(1)} s`),
);
