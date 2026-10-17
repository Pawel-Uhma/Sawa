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
import capture from "../public/capture/timeline.json";
import { cues } from "./cues";

const { fontFamily: jakarta } = loadJakarta("normal", {
  weights: ["400", "800"],
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
/** Od której sekundy nagrania zaczynamy (pomija ładowanie strony). */
export const TRIM_START_SEC = cues.trimStartSec;
export const SCREEN_SEC = cues.trimEndSec - cues.trimStartSec;
export const TOTAL_SEC = INTRO_SEC + SCREEN_SEC + OUTRO_SEC;

const PHONE_H = 960;
const PHONE_W = Math.round((PHONE_H * 393) / 852);

/** Tekst pojawia się sprężyną i znika łagodnie; reduced motion nie dotyczy renderu wideo. */
function useFadeIn(delayFrames = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delayFrames, fps, config: { damping: 200, mass: 0.8 } });
  return { opacity: p, transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)` };
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
  const logo = useFadeIn(4);
  const line = useFadeIn(22);
  return (
    <AbsoluteFill
      style={{ background: "black", alignItems: "center", justifyContent: "center", gap: 28 }}
    >
      <div style={logo}>
        <Logo size={180} />
      </div>
      <div style={{ ...line, fontFamily: jakarta, fontSize: 44, color: "rgba(255,255,255,0.75)" }}>
        Sawa mówi Ci, co jest za oknem.
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const a = useFadeIn(6);
  const b = useFadeIn(36);
  return (
    <AbsoluteFill
      style={{ background: "black", alignItems: "center", justifyContent: "center", gap: 40 }}
    >
      <div
        style={{
          ...a,
          fontFamily: jakarta,
          fontWeight: 800,
          fontSize: 76,
          color: "white",
          letterSpacing: "-0.02em",
          textAlign: "center",
          lineHeight: 1.15,
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

/** Podpis po lewej: krótka etykieta i jedno zdanie. */
function Caption({ kicker, text }: { kicker: string; text: string }) {
  const style = useFadeIn(0);
  return (
    <div style={{ ...style, fontFamily: jakarta, color: "white", maxWidth: 560 }}>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: MIETA,
          marginBottom: 14,
        }}
      >
        {kicker}
      </div>
      <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em" }}>
        {text}
      </div>
    </div>
  );
}

function Screen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + TRIM_START_SEC;
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [(SCREEN_SEC - 0.8) * fps, SCREEN_SEC * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const caption = [...cues.captions].reverse().find((c) => t >= c.atSec && t < c.untilSec);

  return (
    <AbsoluteFill style={{ background: "black", opacity: exit }}>
      {/* Lewa kolumna: co się właśnie dzieje i skąd są dane */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        {caption && <Caption key={caption.atSec} kicker={caption.kicker} text={caption.text} />}
      </div>

      {/* Telefon: sam ekran, zaokrąglony, bez ramki */}
      <div
        style={{
          position: "absolute",
          left: 1920 / 2 - PHONE_W / 2 + 180,
          top: (1080 - PHONE_H) / 2,
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 56,
          overflow: "hidden",
          boxShadow: `0 0 0 2px rgba(255,255,255,0.08), 0 40px 120px ${GLEBIA}55`,
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
          opacity: enter,
        }}
      >
        <OffthreadVideo
          src={staticFile("capture/screen.webm")}
          startFrom={Math.round(TRIM_START_SEC * fps)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Stopka ze źródłami danych */}
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 56,
          fontFamily: jakarta,
          fontSize: 22,
          color: "rgba(255,255,255,0.45)",
        }}
      >
        {cues.footer}
      </div>
    </AbsoluteFill>
  );
}

export function SawaDemo() {
  const { fps } = useVideoConfig();
  const screenFrom = INTRO_SEC * fps;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Sequence durationInFrames={INTRO_SEC * fps}>
        <Intro />
      </Sequence>
      <Sequence from={screenFrom} durationInFrames={Math.round(SCREEN_SEC * fps)}>
        <Screen />
      </Sequence>
      {/* Głos Sawy (ElevenLabs przez API Sawy) dokładnie tam, gdzie zagrał w aplikacji */}
      {capture.timeline
        .filter((c) => c.startSec >= TRIM_START_SEC && c.startSec < cues.trimEndSec)
        .map((c) => (
          <Sequence
            key={`${c.file}-${c.startSec}`}
            from={screenFrom + Math.round((c.startSec - TRIM_START_SEC) * fps)}
          >
            <Audio
              src={staticFile(`capture/${c.file}`)}
              startFrom={Math.round(c.offsetSec * fps)}
            />
          </Sequence>
        ))}
      <Sequence from={screenFrom + Math.round(SCREEN_SEC * fps)} durationInFrames={OUTRO_SEC * fps}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
