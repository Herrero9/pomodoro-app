import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { StorageService } from './storage.service';
import { AlertService } from './alert.service';
import {
  CompletedPeriod,
  DEFAULT_SETTINGS,
  HISTORY_LIMIT,
  PomodoroPhase,
  PomodoroSettings,
  PHASE_LABELS,
  Preset,
  formatFocusDuration,
  headlineFor,
} from '../models/pomodoro.model';

const SETTINGS_KEY = 'pomodoro_settings';
const HISTORY_KEY = 'pomodoro_history';
const STATE_KEY = 'pomodoro_state';
const TICK_MS = 1000;

/**
 * Upper bound on the phases replayed when the app comes back after being
 * closed. Enough to cover a tab left open overnight; past that the timer stops
 * rather than filing a day of imaginary pomodoros.
 */
const MAX_CATCH_UP_PHASES = 64;

/** The part of the running state that outlives a reload. */
interface PersistedState {
  phase: PomodoroPhase;
  secondsRemaining: number;
  phaseTotalSeconds: number;
  workPeriodsCompleted: number;
  isRunning: boolean;
  /** Epoch ms at which the phase ends, `null` unless it was running. */
  deadline: number | null;
  task: string;
  /** Focus seconds banked by the phases the session has already finished. */
  sessionFocusSeconds: number;
  /** Epoch ms the session started, so a stale one from another day starts over. */
  sessionStartedAt: number;
}

/** Options for a phase transition; see `advancePhase`. */
interface AdvanceOptions {
  /** File the finished phase in the history (true for a natural end, false for a skip). */
  recordHistory: boolean;
  /** Instant the phase actually ended, so a replayed transition is not dated "now". */
  at?: number;
  /** Chime/vibrate/notify. Off while replaying phases that ended before the app reopened. */
  announce?: boolean;
}

/**
 * The pomodoro state machine, and the single source of truth for everything the
 * UI shows about the timer. Components read the signals below directly instead
 * of deriving their own copies, so the compact and desktop layouts (and the
 * break overlay) can never disagree with each other.
 */
@Injectable({ providedIn: 'root' })
export class TimerService implements OnDestroy {
  readonly settings = signal<PomodoroSettings>(DEFAULT_SETTINGS);
  readonly phase = signal<PomodoroPhase>('work');
  readonly secondsRemaining = signal<number>(DEFAULT_SETTINGS.workMinutes * 60);
  readonly isRunning = signal<boolean>(false);
  readonly workPeriodsCompleted = signal<number>(0);
  readonly completedPeriods = signal<CompletedPeriod[]>([]);

  /** What the user says they are working on. Filed with every completed work period. */
  readonly task = signal<string>('');

  /**
   * Focus seconds banked by work phases the session has already left behind.
   * The live total adds what the phase in progress has counted down so far, so
   * this only ever moves at a phase boundary.
   */
  private readonly sessionFocusBanked = signal<number>(0);

  /** Epoch ms the running session started. Used to drop a total left over from another day. */
  private sessionStartedAt = Date.now();

  /**
   * Length of the phase in progress. A signal rather than a derivation of
   * `settings`, because changing a duration mid-period (a preset shortcut, a
   * save in Ajustes) must not retroactively resize the period already running
   * -- that would drive `progress` outside 0-1 and break the ring.
   */
  readonly phaseDurationSeconds = signal<number>(DEFAULT_SETTINGS.workMinutes * 60);

  /** Fraction of the current phase already elapsed, 0 to 1. Drives the ring. */
  readonly progress = computed(() => {
    const total = this.phaseDurationSeconds();
    if (total === 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, 1 - this.secondsRemaining() / total));
  });

  readonly isBreak = computed(() => this.phase() !== 'work');

  /**
   * Phase that `skip()` — or running out of time — will move to. Also used by
   * `advancePhase`, so the "next up" hint and the actual transition cannot
   * drift apart.
   */
  readonly nextPhase = computed<PomodoroPhase>(() => {
    if (this.phase() !== 'work') {
      return 'work';
    }
    const upcoming = this.workPeriodsCompleted() + 1;
    return upcoming >= this.settings().sessionsBeforeLongBreak ? 'longBreak' : 'shortBreak';
  });

  /** 1-based number of the work period in progress, for "Ciclo 2/4" style labels. */
  readonly currentCycle = computed(() =>
    this.phase() === 'work' ? this.workPeriodsCompleted() + 1 : this.workPeriodsCompleted()
  );

  /** One entry per work period in the cycle; `true` once that period is done. */
  readonly cycleDots = computed<boolean[]>(() => {
    const total = this.settings().sessionsBeforeLongBreak;
    const completed = this.workPeriodsCompleted();
    return Array.from({ length: total }, (_, i) => i < completed);
  });

  /** Spanish name of the current phase, and of the one coming up. */
  readonly phaseLabel = computed(() => PHASE_LABELS[this.phase()]);
  readonly nextPhaseLabel = computed(() => PHASE_LABELS[this.nextPhase()]);

  /** "Descanso corto · 5 min" — the whole of what comes next, in one line. */
  readonly nextPhaseSummary = computed(() => {
    const minutes = this.durationFor(this.nextPhase(), this.settings()) / 60;
    return `${this.nextPhaseLabel()} · ${minutes} min`;
  });

  /** Work periods finished today. What the "HOY" counter is actually about. */
  readonly workPeriodsToday = computed(() => this.todaysWork().length);

  /** Minutes of *work* logged today, breaks excluded. */
  readonly focusMinutesToday = computed(() =>
    this.todaysWork().reduce((total, period) => total + period.durationMinutes, 0)
  );

  /**
   * Seconds of work counted down since the session began -- the periods it has
   * already finished plus what the one in progress has run. Paused time is not
   * in it: `secondsRemaining` only moves while the clock does. Unlike the "hoy"
   * totals this includes work that was skipped or restarted, because that time
   * was still spent focusing.
   */
  readonly sessionFocusSeconds = computed(() => {
    const inProgress =
      this.phase() === 'work' ? this.phaseDurationSeconds() - this.secondsRemaining() : 0;
    return Math.max(0, this.sessionFocusBanked() + Math.max(0, inProgress));
  });

  /** "1 h 25 min" -- the session total as the UI shows it. */
  readonly sessionFocusLabel = computed(() => formatFocusDuration(this.sessionFocusSeconds()));

  readonly headline = computed(() =>
    headlineFor(this.phase(), this.isRunning(), this.progress() > 0)
  );

  /** Resolves once persisted settings, history and clock state have been read back. */
  readonly ready: Promise<void>;

  private readonly todaysWork = computed(() =>
    this.completedPeriods().filter((period) => period.phase === 'work' && isToday(period))
  );

  private tickSub?: Subscription;
  private advanceTimeout?: ReturnType<typeof setTimeout>;

  /**
   * Wall-clock instant at which the running phase hits zero, `null` while
   * paused. Counting down against a timestamp rather than decrementing on every
   * tick keeps the timer honest when the browser throttles or delays the
   * interval (background tabs, sleeping devices) -- and is what lets the clock
   * be picked back up after a reload.
   */
  private deadline: number | null = null;

  private readonly storage = inject(StorageService);
  private readonly alerts = inject(AlertService);

  constructor() {
    this.ready = this.restore();
  }

  ngOnDestroy(): void {
    this.stopTicking();
  }

  start(): void {
    if (this.isRunning() || this.secondsRemaining() <= 0) {
      return;
    }
    // Browsers only let an audio context open from a user gesture, and this is
    // the gesture that precedes the chime by a whole work period.
    this.alerts.prime();
    this.deadline = Date.now() + this.secondsRemaining() * TICK_MS;
    this.isRunning.set(true);
    this.beginTicking();
    void this.persistState();
  }

  pause(): void {
    this.isRunning.set(false);
    this.stopTicking();
    void this.persistState();
  }

  toggle(): void {
    if (this.isRunning()) {
      this.pause();
    } else {
      this.start();
    }
  }

  /** Puts the current phase back to its full duration and stops the clock. */
  reset(): void {
    this.isRunning.set(false);
    this.stopTicking();
    // Restarting the period throws away its elapsed seconds, so bank them first
    // -- they were focus time whether or not the period is seen through.
    this.bankFocusFromCurrentPhase();
    const duration = this.durationFor(this.phase(), this.settings());
    this.phaseDurationSeconds.set(duration);
    this.secondsRemaining.set(duration);
    void this.persistState();
  }

  /** Jumps to the next phase immediately, without crediting the skipped time as completed. */
  skip(): void {
    this.advancePhase({ recordHistory: false });
  }

  /** Applies a preset's durations, leaving the rest of the settings untouched. */
  applyPreset(preset: Preset): Promise<void> {
    return this.updateSettings({
      ...this.settings(),
      workMinutes: preset.workMinutes,
      shortBreakMinutes: preset.breakMinutes,
    });
  }

  /** Sets the label filed with completed work periods. */
  async setTask(task: string): Promise<void> {
    this.task.set(task);
    await this.persistState();
  }

  async updateSettings(update: PomodoroSettings): Promise<void> {
    // A cycle shorter than the number of periods already done would leave the
    // dots and the "Ciclo 4/2" counter contradicting each other.
    if (this.workPeriodsCompleted() >= update.sessionsBeforeLongBreak) {
      this.workPeriodsCompleted.set(0);
    }

    this.settings.set(update);
    await this.storage.set(SETTINGS_KEY, update);

    // New durations take effect on the next period rather than resizing the one
    // already counting down.
    if (!this.isRunning()) {
      const duration = this.durationFor(this.phase(), update);
      this.phaseDurationSeconds.set(duration);
      this.secondsRemaining.set(duration);
    }
    await this.persistState();
  }

  /** Starts the session total over from zero, without touching the clock or the history. */
  resetSession(): Promise<void> {
    this.sessionFocusBanked.set(this.phase() === 'work' ? -this.elapsedInCurrentPhase() : 0);
    this.sessionStartedAt = Date.now();
    return this.persistState();
  }

  /** Empties the completed-period history. */
  async clearHistory(): Promise<void> {
    this.completedPeriods.set([]);
    await this.storage.set(HISTORY_KEY, []);
  }

  private async restore(): Promise<void> {
    const [settings, history, state] = await Promise.all([
      this.storage.get<PomodoroSettings>(SETTINGS_KEY),
      this.storage.get<CompletedPeriod[]>(HISTORY_KEY),
      this.storage.get<PersistedState>(STATE_KEY),
    ]);
    // Spread over the defaults so settings saved by an older version of the app
    // still get any field added since.
    const resolved = { ...DEFAULT_SETTINGS, ...settings };
    this.settings.set(resolved);
    if (history) {
      this.completedPeriods.set(history);
    }

    if (!state) {
      const duration = this.durationFor(this.phase(), resolved);
      this.phaseDurationSeconds.set(duration);
      this.secondsRemaining.set(duration);
      return;
    }

    this.phase.set(state.phase);
    this.workPeriodsCompleted.set(state.workPeriodsCompleted);
    this.task.set(state.task ?? '');
    // A total carried over from a previous day is not "this session" any more.
    const sessionStartedAt = state.sessionStartedAt ?? Date.now();
    if (isSameDay(sessionStartedAt, Date.now())) {
      this.sessionStartedAt = sessionStartedAt;
      this.sessionFocusBanked.set(state.sessionFocusSeconds ?? 0);
    }
    this.phaseDurationSeconds.set(
      state.phaseTotalSeconds || this.durationFor(state.phase, resolved)
    );
    this.secondsRemaining.set(state.secondsRemaining);

    if (state.isRunning && state.deadline !== null) {
      this.resumeFrom(state.deadline);
    }
  }

  /**
   * Picks a running clock back up after a reload: files every phase that ended
   * while the app was gone, then carries on counting against what is left of
   * the current one. This is the whole point of storing a deadline rather than
   * a number of seconds.
   */
  private resumeFrom(deadline: number): void {
    this.isRunning.set(true);
    this.deadline = deadline;

    let guard = MAX_CATCH_UP_PHASES;
    while (
      this.isRunning() &&
      this.deadline !== null &&
      this.deadline <= Date.now() &&
      guard-- > 0
    ) {
      this.advancePhase({ recordHistory: true, at: this.deadline, announce: false });
    }

    if (!this.isRunning() || this.deadline === null) {
      return; // An auto-start setting stopped the clock at a boundary.
    }
    if (guard <= 0) {
      // Away far too long to reconstruct honestly: stop where it is.
      this.isRunning.set(false);
      this.stopTicking();
      this.secondsRemaining.set(this.phaseDurationSeconds());
      void this.persistState();
      return;
    }

    this.secondsRemaining.set(Math.ceil((this.deadline - Date.now()) / TICK_MS));
    this.beginTicking();
    void this.persistState();
  }

  private durationFor(phase: PomodoroPhase, settings: PomodoroSettings): number {
    switch (phase) {
      case 'work':
        return settings.workMinutes * 60;
      case 'shortBreak':
        return settings.shortBreakMinutes * 60;
      case 'longBreak':
        return settings.longBreakMinutes * 60;
    }
  }

  private beginTicking(): void {
    this.tickSub?.unsubscribe();
    this.tickSub = interval(TICK_MS).subscribe(() => this.tick());
  }

  private tick(): void {
    const remaining = this.deadline === null ? 0 : Math.ceil((this.deadline - Date.now()) / TICK_MS);
    if (remaining > 0) {
      this.secondsRemaining.set(remaining);
      return;
    }
    const endedAt = this.deadline ?? Date.now();
    this.secondsRemaining.set(0);
    // Deferred so the 0-seconds/100% frame actually renders before the phase switches.
    this.advanceTimeout = setTimeout(() => this.advancePhase({ recordHistory: true, at: endedAt }));
  }

  /**
   * Moves to the next phase, optionally filing the finished one in the history.
   * The clock keeps running across the transition unless the matching
   * `autoStart…` setting says otherwise, in which case the next phase is set up
   * and left paused.
   */
  private advancePhase({ recordHistory, at, announce = true }: AdvanceOptions): void {
    const endedAt = at ?? Date.now();
    const finishedPhase = this.phase();
    const settings = this.settings();
    const nextPhase = this.nextPhase();

    if (recordHistory) {
      const label = this.task().trim();
      const period: CompletedPeriod = {
        phase: finishedPhase,
        durationMinutes: this.phaseDurationSeconds() / 60,
        completedAt: new Date(endedAt).toISOString(),
        ...(finishedPhase === 'work' && label ? { task: label } : {}),
      };
      const history = [period, ...this.completedPeriods()].slice(0, HISTORY_LIMIT);
      this.completedPeriods.set(history);
      void this.storage.set(HISTORY_KEY, history);

      if (announce) {
        this.alerts.notifyPhaseEnded(finishedPhase, settings);
      }
    }

    if (finishedPhase === 'work') {
      // A phase that ran out counts in full: on a replayed catch-up transition
      // `secondsRemaining` still holds whatever was persisted before the app closed.
      this.sessionFocusBanked.update(
        (banked) =>
          banked + (recordHistory ? this.phaseDurationSeconds() : this.elapsedInCurrentPhase())
      );
      this.workPeriodsCompleted.update((count) => count + 1);
    } else if (finishedPhase === 'longBreak') {
      // A long break closes the cycle: start counting work periods again.
      this.workPeriodsCompleted.set(0);
    }

    const nextDuration = this.durationFor(nextPhase, settings);
    this.phase.set(nextPhase);
    this.phaseDurationSeconds.set(nextDuration);
    this.secondsRemaining.set(nextDuration);

    if (this.isRunning()) {
      const autoStart = nextPhase === 'work' ? settings.autoStartWork : settings.autoStartBreaks;
      if (autoStart) {
        this.deadline = endedAt + nextDuration * TICK_MS;
      } else {
        this.isRunning.set(false);
        this.stopTicking();
      }
    }
    void this.persistState();
  }

  /** Seconds the phase in progress has counted down so far. */
  private elapsedInCurrentPhase(): number {
    return Math.max(0, this.phaseDurationSeconds() - this.secondsRemaining());
  }

  /** Moves the current work phase's elapsed seconds into the session total. */
  private bankFocusFromCurrentPhase(): void {
    if (this.phase() !== 'work') {
      return;
    }
    const elapsed = this.elapsedInCurrentPhase();
    this.sessionFocusBanked.update((banked) => banked + elapsed);
  }

  private stopTicking(): void {
    this.tickSub?.unsubscribe();
    this.tickSub = undefined;
    clearTimeout(this.advanceTimeout);
    this.deadline = null;
  }

  /**
   * Writes the clock state so a reload can pick it up. Called on transitions
   * only -- never on a tick -- because the deadline is what a restore counts
   * against, and that does not change second to second.
   */
  private persistState(): Promise<void> {
    const state: PersistedState = {
      phase: this.phase(),
      secondsRemaining: this.secondsRemaining(),
      phaseTotalSeconds: this.phaseDurationSeconds(),
      workPeriodsCompleted: this.workPeriodsCompleted(),
      isRunning: this.isRunning(),
      deadline: this.deadline,
      task: this.task(),
      sessionFocusSeconds: this.sessionFocusBanked(),
      sessionStartedAt: this.sessionStartedAt,
    };
    return this.storage.set(STATE_KEY, state);
  }
}

/** Whether a completed period falls on the current calendar day. */
function isToday(period: CompletedPeriod): boolean {
  return isSameDay(new Date(period.completedAt).getTime(), Date.now());
}

/** Whether two instants fall on the same calendar day, in local time. */
function isSameDay(a: number, b: number): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
