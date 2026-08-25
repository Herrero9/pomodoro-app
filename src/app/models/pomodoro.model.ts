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
}

/** A work or break period the user actually ran to completion. */
export interface CompletedPeriod {
  phase: PomodoroPhase;
  durationMinutes: number;
  completedAt: string;
}

export const DEFAULT_SOUND_VIDEO_ID = 'jfKfPfyJRdk';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 30,
  sessionsBeforeLongBreak: 4,
  soundVideoId: DEFAULT_SOUND_VIDEO_ID,
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
