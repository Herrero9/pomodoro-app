import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerService } from './timer.service';
import { StorageService } from './storage.service';
import { CompletedPeriod, DEFAULT_SETTINGS } from '../models/pomodoro.model';

/**
 * In-memory stand-in for `@capacitor/preferences`, backed by a store that
 * outlives the service -- which is what lets the restore tests below seed
 * storage and then build a second `TimerService` on top of it.
 */
const store = new Map<string, unknown>();

class FakeStorageService {
  async get<T>(key: string): Promise<T | null> {
    return (store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    store.set(key, value);
  }
}

/** Builds a `TimerService` reading whatever is currently in `store`. */
async function createTimer(): Promise<TimerService> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: StorageService, useClass: FakeStorageService }],
  });
  const timer = TestBed.inject(TimerService);
  await timer.ready;
  return timer;
}

describe('TimerService', () => {
  let timer: TimerService;

  beforeEach(async () => {
    vi.useFakeTimers();
    store.clear();
    timer = await createTimer();
  });

  afterEach(() => {
    timer.pause();
    vi.useRealTimers();
  });

  it('counts down once started', () => {
    timer.start();
    vi.advanceTimersByTime(3000);

    expect(timer.isRunning()).toBe(true);
    expect(timer.secondsRemaining()).toBe(DEFAULT_SETTINGS.workMinutes * 60 - 3);
  });

  it('holds the countdown while paused', () => {
    timer.start();
    vi.advanceTimersByTime(2000);
    timer.pause();
    vi.advanceTimersByTime(5000);

    expect(timer.isRunning()).toBe(false);
    expect(timer.secondsRemaining()).toBe(DEFAULT_SETTINGS.workMinutes * 60 - 2);
  });

  it('rolls into a short break and records the finished period', () => {
    timer.start();
    vi.advanceTimersByTime(DEFAULT_SETTINGS.workMinutes * 60 * 1000);
    vi.advanceTimersByTime(1); // let the deferred phase switch run

    expect(timer.phase()).toBe('shortBreak');
    expect(timer.isRunning()).toBe(true);
    expect(timer.secondsRemaining()).toBe(DEFAULT_SETTINGS.shortBreakMinutes * 60);
    expect(timer.completedPeriods()[0]).toMatchObject({
      phase: 'work',
      durationMinutes: DEFAULT_SETTINGS.workMinutes,
    });
  });

  it('takes a long break after the configured number of work periods', () => {
    // Skip through work/break pairs until the last work period of the cycle.
    for (let i = 0; i < DEFAULT_SETTINGS.sessionsBeforeLongBreak - 1; i++) {
      timer.skip(); // work -> short break
      timer.skip(); // short break -> work
    }

    expect(timer.nextPhase()).toBe('longBreak');

    timer.skip();
    expect(timer.phase()).toBe('longBreak');
    expect(timer.completedPeriods()).toHaveLength(0); // skipping credits nothing

    // The long break closes the cycle and the count starts over.
    timer.skip();
    expect(timer.phase()).toBe('work');
    expect(timer.currentCycle()).toBe(1);
    expect(timer.cycleDots()).toEqual([false, false, false, false]);
  });

  it('reset returns the current phase to its full duration', () => {
    timer.start();
    vi.advanceTimersByTime(10_000);
    timer.reset();

    expect(timer.isRunning()).toBe(false);
    expect(timer.secondsRemaining()).toBe(DEFAULT_SETTINGS.workMinutes * 60);
    expect(timer.progress()).toBe(0);
  });

  it('applying a preset while idle re-arms the countdown with the new duration', async () => {
    await timer.applyPreset({
      key: '2',
      name: 'Trabajo profundo',
      workMinutes: 50,
      breakMinutes: 10,
      spec: '50 / 10',
    });

    expect(timer.settings().workMinutes).toBe(50);
    expect(timer.settings().shortBreakMinutes).toBe(10);
    expect(timer.secondsRemaining()).toBe(50 * 60);
  });

  it('a shorter preset mid-period leaves the running one alone', async () => {
    timer.start();
    vi.advanceTimersByTime(10_000);

    await timer.applyPreset({
      key: '3',
      name: 'Ráfagas cortas',
      workMinutes: 15,
      breakMinutes: 5,
      spec: '15 / 5',
    });

    // The period already counting down keeps its length, so the ring stays in range.
    expect(timer.phaseDurationSeconds()).toBe(DEFAULT_SETTINGS.workMinutes * 60);
    expect(timer.secondsRemaining()).toBe(DEFAULT_SETTINGS.workMinutes * 60 - 10);
    expect(timer.progress()).toBeGreaterThan(0);
    expect(timer.progress()).toBeLessThanOrEqual(1);
  });

  it('a shorter cycle than the periods already done starts the count over', async () => {
    timer.skip(); // work -> short break, one work period credited
    timer.skip(); // short break -> work
    timer.skip(); // second work period credited
    expect(timer.workPeriodsCompleted()).toBe(2);

    await timer.updateSettings({ ...timer.settings(), sessionsBeforeLongBreak: 2 });

    expect(timer.workPeriodsCompleted()).toBe(0);
    expect(timer.cycleDots()).toEqual([false, false]);
  });

  it('leaves the next phase paused when auto-start is off', async () => {
    await timer.updateSettings({ ...timer.settings(), autoStartBreaks: false });

    timer.start();
    vi.advanceTimersByTime(DEFAULT_SETTINGS.workMinutes * 60 * 1000 + 1);

    expect(timer.phase()).toBe('shortBreak');
    expect(timer.isRunning()).toBe(false);
    expect(timer.secondsRemaining()).toBe(DEFAULT_SETTINGS.shortBreakMinutes * 60);
  });

  it('picks a running clock back up after a reload', async () => {
    timer.start();
    vi.advanceTimersByTime(60_000);
    const remaining = timer.secondsRemaining();

    const restored = await createTimer();

    expect(restored.isRunning()).toBe(true);
    expect(restored.phase()).toBe('work');
    expect(restored.secondsRemaining()).toBe(remaining);
    restored.pause();
  });

  it('files the phases that ended while the app was closed', async () => {
    timer.start();
    timer.pause(); // persists the state, so the deadline below is the only edit
    store.set('pomodoro_state', {
      phase: 'work',
      secondsRemaining: 1,
      phaseTotalSeconds: DEFAULT_SETTINGS.workMinutes * 60,
      workPeriodsCompleted: 0,
      isRunning: true,
      deadline: Date.now() - 1000, // the work period ran out a second ago
      task: 'Escribir el informe',
    });

    const restored = await createTimer();

    expect(restored.phase()).toBe('shortBreak');
    expect(restored.isRunning()).toBe(true);
    expect(restored.completedPeriods()[0]).toMatchObject({
      phase: 'work',
      task: 'Escribir el informe',
    });
    restored.pause();
  });

  it('counts only today’s work periods', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const history: CompletedPeriod[] = [
      { phase: 'work', durationMinutes: 25, completedAt: new Date().toISOString() },
      { phase: 'shortBreak', durationMinutes: 5, completedAt: new Date().toISOString() },
      { phase: 'work', durationMinutes: 50, completedAt: yesterday },
    ];
    store.set('pomodoro_history', history);

    const restored = await createTimer();

    expect(restored.workPeriodsToday()).toBe(1);
    expect(restored.focusMinutesToday()).toBe(25);
  });

  it('clears the history', async () => {
    timer.start();
    vi.advanceTimersByTime(DEFAULT_SETTINGS.workMinutes * 60 * 1000 + 1);
    expect(timer.completedPeriods()).toHaveLength(1);

    await timer.clearHistory();

    expect(timer.completedPeriods()).toHaveLength(0);
    expect(store.get('pomodoro_history')).toEqual([]);
  });
});
