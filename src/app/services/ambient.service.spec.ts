import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AmbientService } from './ambient.service';
import { StorageService } from './storage.service';
import { TimerService } from './timer.service';
import { DEFAULT_SETTINGS } from '../models/pomodoro.model';

/** In-memory stand-in for `@capacitor/preferences`, as in the timer spec. */
const store = new Map<string, unknown>();

class FakeStorageService {
  async get<T>(key: string): Promise<T | null> {
    return (store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    store.set(key, value);
  }
}

/** Builds the service against `store`, on a window as wide as `desktop` says. */
async function createAmbient(desktop = false): Promise<{ ambient: AmbientService; timer: TimerService }> {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({ matches: desktop, media: query, addEventListener: () => undefined }) as unknown as MediaQueryList
  );
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: StorageService, useClass: FakeStorageService }],
  });
  const timer = TestBed.inject(TimerService);
  const ambient = TestBed.inject(AmbientService);
  await Promise.all([timer.ready, ambient.ready]);
  return { ambient, timer };
}

describe('AmbientService', () => {
  beforeEach(() => {
    store.clear();
    // jsdom has no media playback; the logic under test is when to play.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  afterEach(() => {
    TestBed.inject(TimerService).pause();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is silent until a sound is picked', async () => {
    const { ambient, timer } = await createAmbient();
    timer.start();

    expect(ambient.audible()).toBe(false);

    await ambient.select('rain');
    expect(ambient.audible()).toBe(true);
  });

  it('follows the clock by default', async () => {
    const { ambient, timer } = await createAmbient();
    await ambient.select('forest');

    expect(ambient.audible()).toBe(false);
    timer.start();
    expect(ambient.audible()).toBe(true);
    timer.pause();
    expect(ambient.audible()).toBe(false);
  });

  it('keeps playing with the clock stopped when set to always on', async () => {
    const { ambient, timer } = await createAmbient();
    await ambient.select('waves');
    await timer.updateSettings({ ...DEFAULT_SETTINGS, ambientAlwaysOn: true });

    expect(timer.isRunning()).toBe(false);
    expect(ambient.audible()).toBe(true);
    expect(ambient.statusLabel()).toBe('Siempre activo');
  });

  it('turns off when the picked sound is picked again', async () => {
    const { ambient } = await createAmbient();
    await ambient.select('cafe');
    await ambient.select('cafe');

    expect(ambient.sound()).toBeNull();
  });

  it('only plays on the desktop layout when chosen over YouTube', async () => {
    const { ambient, timer } = await createAmbient(true);
    await ambient.select('brown');
    timer.start();

    expect(ambient.active()).toBe(false);
    expect(ambient.audible()).toBe(false);

    await ambient.setSource('ambient');
    expect(ambient.audible()).toBe(true);
  });

  it('restores the choice, dropping a sound that no longer exists', async () => {
    store.set('pomodoro_ambient', { sound: 'rain', volume: 0.3, source: 'ambient' });
    let { ambient } = await createAmbient();
    expect(ambient.sound()).toBe('rain');
    expect(ambient.volume()).toBe(0.3);
    expect(ambient.source()).toBe('ambient');

    store.set('pomodoro_ambient', { sound: 'whales', volume: 0.3, source: 'ambient' });
    ({ ambient } = await createAmbient());
    expect(ambient.sound()).toBeNull();
  });
});
