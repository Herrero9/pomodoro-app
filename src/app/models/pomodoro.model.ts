// Domain model for the pomodoro timer: state shape, persisted settings and
// every piece of Spanish UI copy the app shows. Keeping the copy here (rather
// than in templates) means a phrase is written once and reused by whichever
// layout needs it.

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

/** User-editable configuration, persisted between sessions. */
export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  soundVideoId: string;
  /** Keep the clock running into a break when a work period ends. */
  autoStartBreaks: boolean;
  /** Keep the clock running into the next work period when a break ends. */
  autoStartWork: boolean;
  /** Play a chime (and vibrate, on device) when a phase ends. */
  alertSound: boolean;
  /** Raise a system notification when a phase ends. */
  alertNotification: boolean;
}

/** A work or break period the user actually ran to completion. */
export interface CompletedPeriod {
  phase: PomodoroPhase;
  durationMinutes: number;
  completedAt: string;
  /** What the user was working on, when they labelled the period. */
  task?: string;
}

export const DEFAULT_SOUND_VIDEO_ID = 'jfKfPfyJRdk';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 30,
  sessionsBeforeLongBreak: 4,
  soundVideoId: DEFAULT_SOUND_VIDEO_ID,
  autoStartBreaks: true,
  autoStartWork: true,
  alertSound: true,
  alertNotification: false,
};

/**
 * How many completed periods are kept. The history is written to device
 * storage on every phase change, so it cannot be allowed to grow without a
 * bound; a few hundred entries is more than any "what did I do today" view
 * needs and still serialises in well under a millisecond.
 */
export const HISTORY_LIMIT = 300;

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

/**
 * Human-readable length of a stretch of focus time, in Spanish. Rounded down to
 * whole minutes so the sidebar total does not flicker every second -- the
 * seconds are already on the ring, and this is the calmer, cumulative number.
 */
export function formatFocusDuration(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
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
 * Copy for the notification raised when a phase ends. Keyed by the phase that
 * has just *finished*, which is what the user needs to be told about.
 */
export const PHASE_ALERTS: Record<PomodoroPhase, { title: string; body: string }> = {
  work: { title: 'Periodo terminado', body: 'Levántate: toca descansar.' },
  shortBreak: { title: 'Se acabó el descanso', body: 'De vuelta al foco.' },
  longBreak: { title: 'Se acabó el descanso largo', body: 'Empieza un ciclo nuevo.' },
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
