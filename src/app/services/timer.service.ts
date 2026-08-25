import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { StorageService } from './storage.service';
import {
  CompletedPeriod,
  DEFAULT_SETTINGS,
  PomodoroPhase,
  PomodoroSettings,
  PHASE_LABELS,
  Preset,
  SOUND_SOURCE_LABELS,
  SoundSource,
  headlineFor,
} from '../models/pomodoro.model';

const SETTINGS_KEY = 'pomodoro_settings';
const HISTORY_KEY = 'pomodoro_history';
const TICK_MS = 1000;

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

  readonly phaseDurationSeconds = computed(() => this.durationFor(this.phase(), this.settings()));

  /** Fraction of the current phase already elapsed, 0 to 1. Drives the ring. */
  readonly progress = computed(() => {
    const total = this.phaseDurationSeconds();
    return total === 0 ? 0 : 1 - this.secondsRemaining() / total;
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

  /** Where the background sound comes from, and how the sound panel labels it. */
  readonly soundSource = computed(() => this.settings().soundSource);
  readonly soundSourceLabel = computed(() => SOUND_SOURCE_LABELS[this.soundSource()]);

  readonly headline = computed(() =>
    headlineFor(this.phase(), this.isRunning(), this.progress() > 0)
  );

  /** Resolves once persisted settings and history have been read back. */
  readonly ready: Promise<void>;

  private tickSub?: Subscription;
  private advanceTimeout?: ReturnType<typeof setTimeout>;

  /**
   * Wall-clock instant at which the running phase hits zero, `null` while
   * paused. Counting down against a timestamp rather than decrementing on every
   * tick keeps the timer honest when the browser throttles or delays the
   * interval (background tabs, sleeping devices).
   */
  private deadline: number | null = null;

  private readonly storage = inject(StorageService);

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
    this.deadline = Date.now() + this.secondsRemaining() * TICK_MS;
    this.isRunning.set(true);
    this.tickSub = interval(TICK_MS).subscribe(() => this.tick());
  }

  pause(): void {
    this.isRunning.set(false);
    this.stopTicking();
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
    this.pause();
    this.secondsRemaining.set(this.phaseDurationSeconds());
  }

  /** Jumps to the next phase immediately, without crediting the skipped time as completed. */
  skip(): void {
    this.advancePhase(false);
  }

  /** Switches the background sound between YouTube and Spotify. */
  setSoundSource(source: SoundSource): Promise<void> {
    return this.updateSettings({ ...this.settings(), soundSource: source });
  }

  /** Applies a preset's durations, leaving the rest of the settings untouched. */
  applyPreset(preset: Preset): Promise<void> {
    return this.updateSettings({
      ...this.settings(),
      workMinutes: preset.workMinutes,
      shortBreakMinutes: preset.breakMinutes,
    });
  }

  async updateSettings(update: PomodoroSettings): Promise<void> {
    this.settings.set(update);
    await this.storage.set(SETTINGS_KEY, update);
    if (!this.isRunning()) {
      this.secondsRemaining.set(this.durationFor(this.phase(), update));
    }
  }

  private async restore(): Promise<void> {
    const [settings, history] = await Promise.all([
      this.storage.get<PomodoroSettings>(SETTINGS_KEY),
      this.storage.get<CompletedPeriod[]>(HISTORY_KEY),
    ]);
    // Spread over the defaults so settings saved by an older version of the app
    // still get any field added since.
    const resolved = { ...DEFAULT_SETTINGS, ...settings };
    this.settings.set(resolved);
    this.secondsRemaining.set(this.durationFor(this.phase(), resolved));
    if (history) {
      this.completedPeriods.set(history);
    }
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

  private tick(): void {
    const remaining = this.deadline === null ? 0 : Math.ceil((this.deadline - Date.now()) / TICK_MS);
    if (remaining > 0) {
      this.secondsRemaining.set(remaining);
      return;
    }
    this.secondsRemaining.set(0);
    // Deferred so the 0-seconds/100% frame actually renders before the phase switches.
    this.advanceTimeout = setTimeout(() => this.advancePhase(true));
  }

  /**
   * Moves to the next phase, optionally filing the finished one in the history.
   * The clock keeps running across the transition, so a finished work period
   * rolls straight into its break.
   */
  private advancePhase(recordHistory: boolean): void {
    const finishedPhase = this.phase();
    const settings = this.settings();
    const nextPhase = this.nextPhase();

    if (recordHistory) {
      const period: CompletedPeriod = {
        phase: finishedPhase,
        durationMinutes: this.durationFor(finishedPhase, settings) / 60,
        completedAt: new Date().toISOString(),
      };
      const history = [period, ...this.completedPeriods()];
      this.completedPeriods.set(history);
      this.storage.set(HISTORY_KEY, history);
    }

    if (finishedPhase === 'work') {
      this.workPeriodsCompleted.update((count) => count + 1);
    } else if (finishedPhase === 'longBreak') {
      // A long break closes the cycle: start counting work periods again.
      this.workPeriodsCompleted.set(0);
    }

    const nextDuration = this.durationFor(nextPhase, settings);
    this.phase.set(nextPhase);
    this.secondsRemaining.set(nextDuration);
    if (this.isRunning()) {
      this.deadline = Date.now() + nextDuration * TICK_MS;
    }
  }

  private stopTicking(): void {
    this.tickSub?.unsubscribe();
    this.tickSub = undefined;
    clearTimeout(this.advanceTimeout);
    this.deadline = null;
  }
}
