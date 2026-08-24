export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface CompletedPeriod {
  phase: PomodoroPhase;
  durationMinutes: number;
  completedAt: string;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 30,
  sessionsBeforeLongBreak: 4,
};

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: 'Trabajo',
  shortBreak: 'Descanso corto',
  longBreak: 'Descanso largo',
};
