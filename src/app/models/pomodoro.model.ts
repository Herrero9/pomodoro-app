// Domain model for the pomodoro timer: state shape, persisted settings and
// every piece of Spanish UI copy the app shows. Keeping the copy here (rather
// than in templates) means a phrase is written once and reused by whichever
// layout needs it.

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

/** Where the background sound is embedded from. */
export type SoundSource = 'youtube' | 'spotify';

/** Every source, in the order the pickers list them. */
export const SOUND_SOURCES: SoundSource[] = ['youtube', 'spotify'];

export const SOUND_SOURCE_LABELS: Record<SoundSource, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
};

/** User-editable configuration, persisted between sessions. */
export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  /** Which of the two references below is the one actually embedded. */
  soundSource: SoundSource;
  /** YouTube video ID — see `extractYouTubeId`. */
  soundVideoId: string;
  /** Spotify embed path, `type/id` — see `extractSpotifyRef`. */
  soundSpotifyRef: string;
}

/** A work or break period the user actually ran to completion. */
export interface CompletedPeriod {
  phase: PomodoroPhase;
  durationMinutes: number;
  completedAt: string;
}

export const DEFAULT_SOUND_VIDEO_ID = 'jfKfPfyJRdk';
/** Spotify's "lofi beats" playlist, the counterpart of the default video. */
export const DEFAULT_SOUND_SPOTIFY_REF = 'playlist/37i9dQZF1DWWQRwui0ExPn';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 30,
  sessionsBeforeLongBreak: 4,
  soundSource: 'youtube',
  soundVideoId: DEFAULT_SOUND_VIDEO_ID,
  soundSpotifyRef: DEFAULT_SOUND_SPOTIFY_REF,
};

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/** Extracts a YouTube video ID from a pasted URL, or validates a bare ID. Returns null if unrecognized. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.hostname === 'youtu.be') {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (YOUTUBE_HOSTNAMES.has(url.hostname)) {
    const v = url.searchParams.get('v');
    if (v && YOUTUBE_ID_PATTERN.test(v)) {
      return v;
    }
    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch && YOUTUBE_ID_PATTERN.test(embedMatch[1])) {
      return embedMatch[1];
    }
  }

  return null;
}

const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_HOSTNAMES = new Set(['open.spotify.com', 'play.spotify.com']);
const SPOTIFY_EMBED_TYPES = new Set(['track', 'album', 'playlist', 'artist', 'show', 'episode']);

/** Pairs a Spotify content type with an ID only when both are usable in an embed. */
function spotifyRef(type: string, id: string): string | null {
  return SPOTIFY_EMBED_TYPES.has(type) && SPOTIFY_ID_PATTERN.test(id) ? `${type}/${id}` : null;
}

/**
 * Normalizes a Spotify reference into the `type/id` path its embed player takes
 * (`playlist/37i9dQZF1DWWQRwui0ExPn`). Accepts a shared link — with or without
 * the `/intl-xx` locale segment Spotify inserts — a `spotify:` URI, an embed
 * URL, or an already normalized path. Returns null if unrecognized.
 */
export function extractSpotifyRef(input: string): string | null {
  const trimmed = input.trim();

  const uri = trimmed.match(/^spotify:([a-z]+):([A-Za-z0-9]+)$/);
  if (uri) {
    return spotifyRef(uri[1], uri[2]);
  }

  const bare = trimmed.match(/^([a-z]+)\/([A-Za-z0-9]+)$/);
  if (bare) {
    return spotifyRef(bare[1], bare[2]);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!SPOTIFY_HOSTNAMES.has(url.hostname)) {
    return null;
  }

  // Both the `/embed` prefix and the locale segment are optional noise around
  // the [type, id] pair the player actually needs.
  const segments = url.pathname
    .split('/')
    .filter((segment) => segment && segment !== 'embed' && !/^intl-[a-z-]{2,5}$/.test(segment));

  return segments.length === 2 ? spotifyRef(segments[0], segments[1]) : null;
}

/**
 * Title of the desktop main panel. The break overlay covers the panel during a
 * break, so this only ever reads over a work phase.
 */
export const FOCUS_SESSION_TITLE = 'Sesión de concentración en curso:';

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: 'Trabajo',
  shortBreak: 'Descanso corto',
  longBreak: 'Descanso largo',
};

/**
 * Encouraging line shown next to the countdown. Derived purely from the timer
 * state so both the compact and the desktop layout always say the same thing.
 */
export function headlineFor(phase: PomodoroPhase, isRunning: boolean, started: boolean): string {
  if (phase !== 'work') {
    return 'Respira. Ahora toca descansar.';
  }
  if (isRunning) {
    return 'Estás en ello. Sigue así.';
  }
  return started ? 'En pausa. Retómalo cuando quieras.' : 'Listo cuando quieras.';
}

/** Keyboard shortcuts, listed in the desktop footer and handled by `HomePage`. */
export const SHORTCUTS: { key: string; label: string }[] = [
  { key: 'ESPACIO', label: 'Iniciar / pausar' },
  { key: 'S', label: 'Saltar' },
  { key: 'R', label: 'Reiniciar' },
  { key: 'T', label: 'Tema' },
  { key: '1–4', label: 'Preset' },
];

/** A selectable work/break duration pair. */
export interface Preset {
  key: string;
  name: string;
  workMinutes: number;
  breakMinutes: number;
  spec: string;
}

/** Work/break duration pairs offered as one-tap presets (keys 1-4). */
export const PRESETS: Preset[] = [
  { key: '1', name: 'Clásico', workMinutes: 25, breakMinutes: 5, spec: '25 / 5' },
  { key: '2', name: 'Trabajo profundo', workMinutes: 50, breakMinutes: 10, spec: '50 / 10' },
  { key: '3', name: 'Ráfagas cortas', workMinutes: 15, breakMinutes: 5, spec: '15 / 5' },
  { key: '4', name: 'Bloque de estudio', workMinutes: 45, breakMinutes: 15, spec: '45 / 15' },
];

/** One suggestion shown while a break is running. */
export interface RestIdea {
  title: string;
  body: string;
}

/** Suggestions rotated through by the break overlay. */
export const REST_IDEAS: RestIdea[] = [
  {
    title: 'Rellena el vaso.',
    body: 'Agua, no café. Y te levanta de la silla, que es lo que de verdad importa aquí.',
  },
  {
    title: 'Mira por la ventana.',
    body: 'Veinte segundos en algo que esté a más de seis metros. Tus ojos llevan un rato clavados a la misma distancia.',
  },
  {
    title: 'Ponte de pie y suelta los hombros.',
    body: 'Despacio, en los dos sentidos. Nadie te está mirando y el cuello lleva toda la mañana aguantando.',
  },
  {
    title: 'Apunta el cabo suelto.',
    body: 'Eso que se te ha cruzado durante el intervalo: déjalo escrito y dejará de pedirte atención.',
  },
  {
    title: 'No hagas nada.',
    body: 'En serio, nada. Un descanso gastado en scroll es un descanso que tu atención no recupera.',
  },
];
