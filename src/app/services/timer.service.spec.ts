import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerService } from './timer.service';
import { StorageService } from './storage.service';
import { DEFAULT_SETTINGS } from '../models/pomodoro.model';

/** In-memory stand-in for `@capacitor/preferences`. */
class FakeStorageService {
  private readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }
}

describe('TimerService', () => {
  let timer: TimerService;

  beforeEach(async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useClass: FakeStorageService }],
    });
    timer = TestBed.inject(TimerService);
    await timer.ready;
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
});
