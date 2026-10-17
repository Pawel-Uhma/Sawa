import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import cues from "./cues.json";

const { fontFamily: jakarta } = loadJakarta("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin", "latin-ext"],
});
const { fontFamily: fredoka } = loadFredoka("normal", {
  weights: ["600"],
  subsets: ["latin", "latin-ext"],
});

// Marka z docs/awatar/README.md
const GLEBIA = "#17706F";
const MIETA = "#8ED1B5";
const KORAL = "#F2755F";

export const FPS = 30;
export const INTRO_SEC = 4;
export const OUTRO_SEC = 5;
export const TOTAL_SEC = INTRO_SEC + cues.screenSec + OUTRO_SEC;

const PHONE_H = 960;
const PHONE_W = Math.round((PHONE_H * 393) / 852);
const PHONE_LEFT = 1920 - 220 - PHONE_W;
const TEXT_LEFT = 140;
const TEXT_W = PHONE_LEFT - TEXT_LEFT - 120;

const f = (sec: number) => Math.round(sec * FPS);
const SPRING = { damping: 200, mass: 0.8 };

/** Wejście sprężyną: lekki ruch w górę i pojawienie się. */
function useEnter(delayFrames = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delayFrames, fps, config: SPRING });
  return { opacity: p, transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)` };
}

/** Łagodne wyjście w ostatnich klatkach sekwencji. */
function useExit(durationFrames: number, fadeFrames = 12) {
  const frame = useCurrentFrame();
  return interpolate(frame, [durationFrames - fadeFrames, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
}

function Logo({ size }: { size: number }) {
  return (
    <span
      style={{
        fontFamily: fredoka,
        fontWeight: 600,
        fontSize: size,
        color: "white",
        letterSpacing: "-0.02em",
      }}
    >
      sawa<span style={{ color: KORAL }}>.</span>
    </span>
  );
}

function Intro() {
  const logo = useEnter(4);
  const line = useEnter(20);
  const exit = useExit(f(INTRO_SEC));
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 28, opacity: exit }}
    >
      <div style={logo}>
        <Logo size={180} />
      </div>
      <div
        style={{
          ...line,
          fontFamily: jakarta,
          fontWeight: 600,
          fontSize: 46,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        Sawa mówi Ci, co jest za oknem.
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const a = useEnter(6);
  const b = useEnter(34);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48 }}>
      <div
        style={{
          ...a,
          fontFamily: jakarta,
          fontWeight: 800,
          fontSize: 84,
          color: "white",
          letterSpacing: "-0.02em",
          textAlign: "center",
          lineHeight: 1.12,
        }}
      >
        Za oknem jest historia.
        <br />
        <span style={{ color: MIETA }}>Sawa ją opowiada.</span>
      </div>
      <div style={b}>
        <Logo size={96} />
      </div>
    </AbsoluteFill>
  );
}

/** Nagłówek segmentu: co teraz jest za oknem. */
function Kicker({ text }: { text: string }) {
  const style = useEnter(0);
  return (
    <div
      style={{
        ...style,
        fontFamily: jakarta,
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: MIETA,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 7, background: KORAL }} />
      {text}
    </div>
  );
}

/** Zdanie Sawy: wchodzi, gdy je mówi, i zostaje do następnego. */
function Line({ text, big }: { text: string; big?: boolean }) {
  const style = useEnter(0);
  return (
    <div
      style={{
        ...style,
        fontFamily: jakarta,
        fontWeight: big ? 800 : 600,
        fontSize: big ? 64 : 50,
        lineHeight: 1.18,
        letterSpacing: "-0.015em",
        color: "white",
      }}
    >
      {text}
    </div>
  );
}

type Segment = (typeof cues.segments)[number];

function SegmentText({ segment }: { segment: Segment }) {
  const frame = useCurrentFrame();
  const t = frame / FPS + segment.atSec;
  const current = [...segment.subtitles].reverse().find((s) => t >= s.fromSec);
  return (
    <div
      style={{
        position: "absolute",
        left: TEXT_LEFT,
        top: 0,
        bottom: 0,
        width: TEXT_W,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 36,
      }}
    >
      <Kicker text={segment.kicker} />
      <div style={{ minHeight: 360 }}>
        {segment.text && <Line big text={segment.text} />}
        {current && <Line key={current.fromSec} text={current.text} />}
      </div>
    </div>
  );
}

function Phone() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: PHONE_LEFT,
        top: (1080 - PHONE_H) / 2,
        width: PHONE_W,
        height: PHONE_H,
        borderRadius: 54,
        overflow: "hidden",
        background: "#0C2423",
        boxShadow: `0 0 0 2px rgba(255,255,255,0.10), 0 40px 140px ${GLEBIA}66`,
        transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        opacity: enter,
      }}
    >
      {cues.segments.map((s) => (
        <Sequence key={s.atSec} from={f(s.atSec)} durationInFrames={f(s.durationSec)} layout="none">
          <OffthreadVideo
            src={staticFile("capture/screen.mp4")}
            startFrom={f(s.srcFromSec)}
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Sequence>
      ))}
    </div>
  );
}

function Screen() {
  const exit = useExit(f(cues.screenSec), 18);
  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <Phone />
      {cues.segments.map((s) => (
        <Sequence key={s.atSec} from={f(s.atSec)} durationInFrames={f(s.durationSec)}>
          <SegmentText segment={s} />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          left: TEXT_LEFT,
          bottom: 52,
          fontFamily: jakarta,
          fontSize: 22,
          color: "rgba(255,255,255,0.45)",
        }}
      >
        Dane: ZTM (dane.um.warszawa.pl, GTFS), Wikipedia, warszawa1939.pl, OpenStreetMap · Głos:
        ElevenLabs
      </div>
    </AbsoluteFill>
  );
}

export function SawaDemo() {
  const screenFrom = f(INTRO_SEC);
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Sequence durationInFrames={f(INTRO_SEC)}>
        <Intro />
      </Sequence>
      <Sequence from={screenFrom} durationInFrames={f(cues.screenSec)}>
        <Screen />
      </Sequence>
      {/* Głos Sawy (ElevenLabs przez API Sawy) dokładnie tam, gdzie zagrał w aplikacji */}
      {cues.segments.map((s) => {
        const audio = s.audio;
        if (!audio) return null;
        const frames = f(audio.durationSec);
        return (
          <Sequence key={audio.file} from={screenFrom + f(audio.atSec)} durationInFrames={frames}>
            <Audio
              src={staticFile(`capture/${audio.file}`)}
              volume={(fr) =>
                interpolate(fr, [frames - 9, frames], [1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              }
            />
          </Sequence>
        );
      })}
      <Sequence from={screenFrom + f(cues.screenSec)} durationInFrames={f(OUTRO_SEC)}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
