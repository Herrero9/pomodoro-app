import { Injectable, computed, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { StorageService } from './storage.service';
import {
  CompletedPeriod,
  DEFAULT_SETTINGS,
  PomodoroPhase,
  PomodoroSettings,
} from '../models/pomodoro.model';

const SETTINGS_KEY = 'pomodoro_settings';
const HISTORY_KEY = 'pomodoro_history';

@Injectable({ providedIn: 'root' })
export class TimerService {
  readonly settings = signal<PomodoroSettings>(DEFAULT_SETTINGS);
  readonly phase = signal<PomodoroPhase>('work');
  readonly secondsRemaining = signal<number>(DEFAULT_SETTINGS.workMinutes * 60);
  readonly isRunning = signal<boolean>(false);
  readonly workPeriodsCompleted = signal<number>(0);
  readonly completedPeriods = signal<CompletedPeriod[]>([]);

  readonly phaseDurationSeconds = computed(() =>
    this.durationFor(this.phase(), this.settings())
  );

  readonly progress = computed(() => {
    const total = this.phaseDurationSeconds();
    return total === 0 ? 0 : 1 - this.secondsRemaining() / total;
  });

  readonly ready: Promise<void>;

  private tickSub?: Subscription;

  constructor(private storage: StorageService) {
    this.ready = this.restore();
  }

  private async restore(): Promise<void> {
    const [settings, history] = await Promise.all([
      this.storage.get<PomodoroSettings>(SETTINGS_KEY),
      this.storage.get<CompletedPeriod[]>(HISTORY_KEY),
    ]);
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

  start(): void {
    if (this.isRunning() || this.secondsRemaining() <= 0) {
      return;
    }
    this.isRunning.set(true);
    this.tickSub = interval(1000).subscribe(() => this.tick());
  }

  pause(): void {
    this.isRunning.set(false);
    this.tickSub?.unsubscribe();
  }

  reset(): void {
    this.pause();
    this.secondsRemaining.set(this.phaseDurationSeconds());
  }

  /** Jumps to the next phase immediately, without crediting the skipped time as completed. */
  skip(): void {
    this.advancePhase(false);
  }

  private tick(): void {
    const remaining = this.secondsRemaining() - 1;
    if (remaining <= 0) {
      this.secondsRemaining.set(0);
      this.advancePhase(true);
    } else {
      this.secondsRemaining.set(remaining);
    }
  }

  private advancePhase(recordHistory: boolean): void {
    const finishedPhase = this.phase();
    const settings = this.settings();

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

    let nextWorkCount = this.workPeriodsCompleted();
    let nextPhase: PomodoroPhase;

    if (finishedPhase === 'work') {
      nextWorkCount += 1;
      nextPhase = nextWorkCount >= settings.sessionsBeforeLongBreak ? 'longBreak' : 'shortBreak';
    } else {
      nextPhase = 'work';
      if (finishedPhase === 'longBreak') {
        nextWorkCount = 0;
      }
    }

    this.workPeriodsCompleted.set(nextWorkCount);
    this.phase.set(nextPhase);
    this.secondsRemaining.set(this.durationFor(nextPhase, settings));
  }

  async updateSettings(update: PomodoroSettings): Promise<void> {
    this.settings.set(update);
    await this.storage.set(SETTINGS_KEY, update);
    if (!this.isRunning()) {
      this.secondsRemaining.set(this.durationFor(this.phase(), update));
    }
  }
}
