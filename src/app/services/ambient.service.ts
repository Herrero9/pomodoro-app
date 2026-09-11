import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { TimerService } from './timer.service';
import {
  AMBIENT_SOUNDS,
  AmbientSound,
  AmbientSoundId,
  SoundSource,
  ambientStatusFor,
} from '../models/pomodoro.model';

const AMBIENT_KEY = 'pomodoro_ambient';
const DEFAULT_VOLUME = 0.6;

/**
 * Mirrors `$desktop` in `src/theme/_breakpoints.scss`. Below it the compact
 * layout is the one on screen, and that layout has no YouTube player.
 */
const DESKTOP_QUERY = '(min-width: 900px)';

/** The listener's choice, as it is persisted. */
interface PersistedAmbient {
  sound: AmbientSoundId | null;
  volume: number;
  source: SoundSource;
}

/**
 * The looping ambient sound: which one is picked, how loud, and whether it
 * should be heard right now. It plays while the clock runs and pauses with it,
 * unless `settings.ambientAlwaysOn` says to keep it going.
 *
 * Playback is a plain `<audio>` element rather than WebAudio, because iOS
 * suspends an `AudioContext` the moment the screen locks while a media element
 * keeps playing -- and a phone in a pocket is exactly where this is used. The
 * file is fetched and played from a `blob:` URL: that request goes through the
 * service worker (so it works offline), and a blob answers the range requests a
 * media element makes, which the Angular service worker does not.
 *
 * Created by `AppComponent`, so it keeps playing on any route.
 */
@Injectable({ providedIn: 'root' })
export class AmbientService {
  /** The sound picked, or `null` for none. */
  readonly sound = signal<AmbientSoundId | null>(null);

  /** 0 to 1. */
  readonly volume = signal<number>(DEFAULT_VOLUME);

  /** What the desktop sidebar shows. Irrelevant below the desktop breakpoint. */
  readonly source = signal<SoundSource>('youtube');

  readonly current = computed<AmbientSound | null>(
    () => AMBIENT_SOUNDS.find((sound) => sound.id === this.sound()) ?? null
  );

  /**
   * Whether the ambient sound is the background sound in use at all: always on
   * the compact layout, and on the desktop one only when picked over YouTube.
   */
  readonly active = computed(() => !this.isDesktop() || this.source() === 'ambient');

  /** Whether the loop should be playing right now. */
  readonly audible = computed(
    () =>
      this.current() !== null &&
      this.active() &&
      (this.timer.isRunning() || this.timer.settings().ambientAlwaysOn)
  );

  readonly statusLabel = computed(() =>
    ambientStatusFor(
      this.current() !== null,
      this.timer.settings().ambientAlwaysOn,
      this.timer.isRunning()
    )
  );

  /**
   * iOS ignores `volume` on media elements (the hardware buttons are the only
   * control), so the slider is hidden there rather than left doing nothing.
   */
  readonly volumeAdjustable = canSetVolume();

  /** Resolves once the stored choice has been read back. */
  readonly ready: Promise<void>;

  private readonly timer = inject(TimerService);
  private readonly storage = inject(StorageService);

  private readonly isDesktop = signal(matchesDesktop());
  private readonly audio = new Audio();

  /** Id of the sound whose blob is in `audio.src`, and that blob's URL. */
  private loadedId: AmbientSoundId | null = null;
  private objectUrl: string | null = null;
  /** Bumped per load, so a slow fetch cannot overwrite a newer choice. */
  private loadToken = 0;

  /**
   * Set when something other than this service paused the element: the lock
   * screen's pause button, or another app taking the audio. That choice is
   * respected until the sound stops being wanted anyway, instead of being
   * undone by the next tap anywhere in the app.
   */
  private heldExternally = false;
  private pausingOurselves = false;

  constructor() {
    this.audio.loop = true;
    this.audio.addEventListener('pause', () => {
      this.heldExternally = !this.pausingOurselves;
      this.pausingOurselves = false;
    });
    this.audio.addEventListener('play', () => {
      this.heldExternally = false;
    });
    this.ready = this.restore();

    effect(() => {
      this.audio.volume = this.volume();
    });

    effect(() => {
      const sound = this.current();
      const audible = this.audible();
      if (sound && sound.id !== this.loadedId) {
        // Fetched as soon as it is picked, even while silent, so that pressing
        // start has something to play inside the same gesture.
        void this.load(sound);
      }
      this.sync(audible);
    });

    window.matchMedia?.(DESKTOP_QUERY).addEventListener('change', (event) => {
      this.isDesktop.set(event.matches);
    });

    // Browsers only start media from a user gesture. Starting the clock is one,
    // but by the time the effect above reacts to it the gesture may no longer
    // count (and on iOS a fetch in between always loses it). These run after
    // the app's own handlers -- a click bubbles up to the document after the
    // button has handled it, and a window listener after `HomePage`'s document
    // one -- so the clock is already running when they look.
    document.addEventListener('click', () => this.sync(this.audible()));
    window.addEventListener('keydown', () => this.sync(this.audible()));
  }

  /** Picks a sound, or turns it off when the one already picked is chosen again. */
  select(id: AmbientSoundId): Promise<void> {
    // Picking a sound is as explicit as it gets: it overrides a lock-screen pause.
    this.heldExternally = false;
    this.sound.set(this.sound() === id ? null : id);
    return this.persist();
  }

  setVolume(volume: number): Promise<void> {
    this.volume.set(Math.min(1, Math.max(0, volume)));
    return this.persist();
  }

  setSource(source: SoundSource): Promise<void> {
    this.source.set(source);
    return this.persist();
  }

  private async restore(): Promise<void> {
    const stored = await this.storage.get<PersistedAmbient>(AMBIENT_KEY);
    if (!stored) {
      return;
    }
    // A sound that has since been removed from the list reads as none.
    this.sound.set(AMBIENT_SOUNDS.some((sound) => sound.id === stored.sound) ? stored.sound : null);
    this.volume.set(stored.volume ?? DEFAULT_VOLUME);
    this.source.set(stored.source ?? 'youtube');
  }

  private persist(): Promise<void> {
    return this.storage.set<PersistedAmbient>(AMBIENT_KEY, {
      sound: this.sound(),
      volume: this.volume(),
      source: this.source(),
    });
  }

  /** Brings the element in line with `audible`. Safe to call as often as needed. */
  private sync(audible: boolean): void {
    if (!audible) {
      this.heldExternally = false;
    }
    if (!audible || this.loadedId !== this.sound()) {
      this.pauseAudio();
      this.clearMediaSession();
      return;
    }
    if (!this.audio.paused || this.heldExternally) {
      return;
    }
    // Refused without a gesture: the click/keydown listeners try again on the
    // next one. Anything else (a broken file) is not worth surfacing. Wrapped
    // because not every engine returns a promise from `play()`.
    Promise.resolve(this.audio.play()).then(
      () => this.setMediaSession(),
      () => undefined
    );
  }

  private async load(sound: AmbientSound): Promise<void> {
    const token = ++this.loadToken;
    let url: string;
    try {
      const response = await fetch(sound.file);
      if (!response.ok) {
        return;
      }
      url = URL.createObjectURL(await response.blob());
    } catch {
      return; // Offline before it was ever cached.
    }
    if (token !== this.loadToken) {
      URL.revokeObjectURL(url);
      return;
    }
    this.pauseAudio();
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    this.objectUrl = url;
    this.audio.src = url;
    this.loadedId = sound.id;
    this.sync(this.audible());
  }

  private pauseAudio(): void {
    if (!this.audio.paused) {
      this.pausingOurselves = true;
      this.audio.pause();
    }
  }

  /**
   * Names the sound on the lock screen and in the notification shade. The
   * default play/pause actions act on the element directly, which is what the
   * user expects from those controls.
   */
  private setMediaSession(): void {
    const sound = this.current();
    if (!sound || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') {
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: sound.name,
      artist: 'Pomodoro · sonido ambiente',
    });
  }

  private clearMediaSession(): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
    }
  }
}

function matchesDesktop(): boolean {
  return window.matchMedia?.(DESKTOP_QUERY).matches ?? false;
}

/** Whether writing `volume` on a media element sticks. It does not on iOS. */
function canSetVolume(): boolean {
  const probe = document.createElement('audio');
  probe.volume = 0.5;
  return probe.volume === 0.5;
}
