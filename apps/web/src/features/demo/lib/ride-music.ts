/**
 * Muzyka w tle podczas jazdy: dwa utwory, które przeglądarka gra na żywo (bez plików, więc bez licencji)
 * i zmienia na przemian. Tu jest sam zapis utworów i reguły; dźwięk robi `ride-music-player.ts`.
 */

export type MusicEvent =
  | { kind: "keys"; hz: number; offsetSec: number; velocity: number; durationSec: number }
  | { kind: "pluck"; hz: number; offsetSec: number; velocity: number; cutoffHz: number }
  | {
      kind: "pad";
      hz: number[];
      offsetSec: number;
      velocity: number;
      durationSec: number;
      wave: "sine" | "sawtooth";
      cutoffHz: number;
    }
  | { kind: "kick" | "snare" | "hat"; offsetSec: number; velocity: number };

export type Track = {
  id: "lofi" | "pulse";
  /** Krok, w którym planujemy nuty (szesnastka). */
  stepSec: number;
  reverbWet: number;
  /** Filtr na wyjściu: lo-fi jest ciemniejsze. */
  toneHz: number;
  /** Trzask płyty pod spodem. */
  vinyl: boolean;
  /** Utwór jako funkcja kroku: co zagrać w kroku `n`. `random` podajemy w testach. */
  create: (random: () => number) => (n: number) => MusicEvent[];
};

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Częstotliwość nuty zapisanej jak „A4” albo „F#3” (A4 = 440 Hz). */
export function noteHz(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new Error(`Nieznana nuta: ${name}`);
  const [, letter = "C", accidental, octave] = match;
  const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = 12 * (Number(octave) + 1) + (SEMITONES[letter] ?? 0) + shift;
  return 440 * 2 ** ((midi - 69) / 12);
}

function at<T>(list: Cycle<T>, i: number): T {
  return list[((i % list.length) + list.length) % list.length] ?? list[0];
}

/** Lista, z której bierzemy po kolei w kółko; niepusta, więc zawsze jest co zagrać. */
type Cycle<T> = readonly [T, ...T[]];

// Lo-fi w tramwaju: 84 BPM, ii–V–I–vi w C-dur, akordy w średnicy klawiatury, żeby nie gryzły się z głosem
const LOFI_CHORDS: Cycle<Cycle<string>> = [
  ["F3", "A3", "C4", "E4"],
  ["F3", "B3", "E4", "A4"],
  ["E3", "G3", "B3", "D4"],
  ["G3", "C4", "E4", "B4"],
] as const;
const LOFI_BASS = ["D2", "G2", "C2", "A2"] as const;
const LOFI_MELODY = ["D5", "E5", "G5", "A5", "C6", "D6"] as const;
/** Druga i czwarta szesnastka w ćwierćnucie są spóźnione, stąd luźny, „bujający” rytm. */
const SWING_SEC = 0.035;
const STRUM_SEC = 0.02;

function createLofi(random: () => number) {
  // Melodia błądzi po skali o krok albo dwa: nie powtarza się, ale brzmi jak fraza
  let melody = 2;
  return (n: number): MusicEvent[] => {
    const step = n % 16;
    const bar = Math.floor(n / 16);
    const swing = step % 4 === 2 ? SWING_SEC : 0;
    const chord = at(LOFI_CHORDS, bar);
    const bass = noteHz(at(LOFI_BASS, bar));
    const events: MusicEvent[] = [];
    const keys = (hz: number, velocity: number, durationSec: number, offsetSec = swing) => {
      events.push({ kind: "keys", hz, offsetSec, velocity, durationSec });
    };

    if (step === 0) {
      for (const [i, note] of chord.entries()) keys(noteHz(note), 0.08, 2.6, i * STRUM_SEC);
    }
    if (step === 6 || (step === 12 && random() < 0.6)) {
      for (const [i, note] of chord.entries()) {
        keys(noteHz(note), 0.05, 1.2, swing + i * STRUM_SEC * 0.75);
      }
    }
    if (step === 0) keys(bass, 0.18, 1.2);
    if (step === 6) keys(bass * 1.5, 0.11, 0.6);
    if (step === 10) keys(bass * 2, 0.1, 0.6);

    if (step === 0 || step === 10 || (step === 14 && random() < 0.35)) {
      events.push({ kind: "kick", offsetSec: swing, velocity: 0.32 });
    }
    if (step === 4 || step === 12) events.push({ kind: "snare", offsetSec: swing, velocity: 0.09 });
    if (step % 2 === 0) {
      events.push({ kind: "hat", offsetSec: swing, velocity: step % 4 ? 0.028 : 0.016 });
    } else if (random() < 0.25) {
      events.push({ kind: "hat", offsetSec: 0, velocity: 0.01 });
    }

    if (step % 2 === 0 && step !== 0 && random() < 0.28) {
      const move = at([-2, -1, 1, 1, 2], Math.floor(random() * 5));
      melody = Math.max(0, Math.min(LOFI_MELODY.length - 1, melody + move));
      keys(noteHz(at(LOFI_MELODY, melody)), 0.055, 1.4);
    }
    return events;
  };
}

// Puls miasta: 100 BPM, a-moll, sześciodźwiękowy wzór na szesnastkach, który przesuwa się
// względem taktu jak u minimalistów; filtr otwiera się i zamyka co 20 s
const PULSE_STEP_SEC = 60 / 100 / 4;
const PULSE_CHORDS: Cycle<Cycle<string>> = [
  ["A3", "C4", "E4", "G4", "B4"],
  ["F3", "A3", "C4", "E4", "G4"],
  ["G3", "C4", "D4", "E4", "G4"],
  ["G3", "B3", "D4", "E4", "A4"],
] as const;
const PULSE_BASS = ["A2", "F2", "C3", "G2"] as const;
const PULSE_PATTERN = [0, 2, 1, 3, 2, 4] as const;
const PULSE_CHORD_STEPS = 32;
const PULSE_SWEEP_SEC = 20;

function createPulse() {
  return (n: number): MusicEvent[] => {
    const chord = at(PULSE_CHORDS, Math.floor(n / PULSE_CHORD_STEPS));
    const events: MusicEvent[] = [];
    if (n % PULSE_CHORD_STEPS === 0) {
      const durationSec = PULSE_CHORD_STEPS * PULSE_STEP_SEC;
      const bass = noteHz(at(PULSE_BASS, Math.floor(n / PULSE_CHORD_STEPS)));
      events.push(
        {
          kind: "pad",
          // Oktawa wyżej, bo głośnik telefonu sam basu prawie nie gra
          hz: [bass, bass * 2],
          offsetSec: 0,
          velocity: 0.1,
          durationSec,
          wave: "sine",
          cutoffHz: 300,
        },
        {
          kind: "pad",
          hz: chord.slice(0, 3).map(noteHz),
          offsetSec: 0,
          velocity: 0.04,
          durationSec,
          wave: "sawtooth",
          cutoffHz: 900,
        },
      );
    }
    const cutoffHz = 950 + 450 * Math.sin((2 * Math.PI * n * PULSE_STEP_SEC) / PULSE_SWEEP_SEC);
    const hz = noteHz(at(chord, at(PULSE_PATTERN, n)));
    events.push({
      kind: "pluck",
      hz,
      offsetSec: 0,
      velocity: n % 4 === 0 ? 0.1 : 0.06,
      cutoffHz,
    });
    return events;
  };
}

export const TRACKS: Cycle<Track> = [
  {
    id: "lofi",
    stepSec: 60 / 84 / 4,
    reverbWet: 0.35,
    toneHz: 4200,
    vinyl: true,
    create: createLofi,
  },
  {
    id: "pulse",
    stepSec: PULSE_STEP_SEC,
    reverbWet: 0.5,
    toneHz: 9000,
    vinyl: false,
    create: createPulse,
  },
];

/** Utwór numer `i` po kolei, w kółko. */
export function trackAt(i: number): Track {
  return at(TRACKS, i);
}

/** Utwór gra co najmniej tyle, a zmienia się, gdy Sawa zaczyna mówić: przyciszona zmiana ginie pod głosem. */
export const TRACK_MIN_SEC = 150;
/** Gdy Sawa długo milczy, utwór i tak się zmienia. */
export const TRACK_MAX_SEC = 300;

export function shouldSwitchTrack(playedSec: number, speaking: boolean): boolean {
  return playedSec >= TRACK_MAX_SEC || (speaking && playedSec >= TRACK_MIN_SEC);
}

/** Stan odtwarzacza opowieści, z którego wynika, czy Sawa właśnie mówi. */
export type SpeechState = {
  isPlaying: boolean;
  loading: boolean;
  failed: boolean;
  progress: number;
};

/**
 * Sawa mówi, gdy opowieść gra i jeszcze się nie skończyła. Gdy opowieść się wczytuje,
 * skończyła albo nie wyszła, nie ma nic do powiedzenia i muzyka wraca.
 */
export function isSawaSpeaking({ isPlaying, loading, failed, progress }: SpeechState): boolean {
  return isPlaying && !loading && !failed && progress < 100;
}

export type RideSound = { onRoute: boolean; held: boolean; waiting: boolean; isPlaying: boolean };

/**
 * Muzyka gra razem z Sawą: na trasie, póki Sawa opowiada albo czeka na pierwsze miejsce.
 * Każda pauza Sawy (przycisk albo przeglądarka, która zablokowała głos) zatrzymuje też muzykę.
 */
export function musicPlays({ onRoute, held, waiting, isPlaying }: RideSound): boolean {
  return onRoute && !held && (isPlaying || waiting);
}

/** localStorage: muzyka jest domyślnie włączona, zapisujemy tylko wyłączenie. */
export const MUSIC_STORAGE_KEY = "sawa-music";

export function parseMusicPreference(value: unknown): boolean {
  return value !== "off";
}
