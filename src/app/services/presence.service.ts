import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TimerService } from './timer.service';
import { formatMmss } from '../shared/pipes/mmss.pipe';

const APP_NAME = 'Pomodoro';

/** Minimal shape of the Screen Wake Lock API, which TS's DOM lib may not carry. */
interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
}
interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

/**
 * The two things the timer has to do *outside* the app's own UI while it runs:
 * put the countdown in the browser tab title, and keep the screen awake.
 *
 * Created by `AppComponent` for its side effects -- nothing reads it back.
 */
@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly timer = inject(TimerService);
  private readonly title = inject(Title);

  private sentinel: WakeLockSentinelLike | null = null;

  constructor() {
    // A tab that is not the active one is exactly when the title matters, so
    // this runs whether or not the app is visible.
    effect(() => {
      const seconds = this.timer.secondsRemaining();
      const phase = this.timer.phaseLabel();
      this.title.setTitle(
        this.timer.isRunning() ? `${formatMmss(seconds)} · ${phase} — ${APP_NAME}` : APP_NAME
      );
    });

    effect(() => {
      if (this.timer.isRunning()) {
        void this.acquireWakeLock();
      } else {
        void this.releaseWakeLock();
      }
    });

    // The browser drops the lock whenever the tab is hidden, and does not hand
    // it back on return; re-requesting is the documented way to keep it.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.timer.isRunning()) {
        void this.acquireWakeLock();
      }
    });
  }

  private async acquireWakeLock(): Promise<void> {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (!wakeLock || (this.sentinel && !this.sentinel.released)) {
      return;
    }
    try {
      this.sentinel = await wakeLock.request('screen');
    } catch {
      // Denied, unsupported, or the document was not visible. Not worth surfacing.
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel && !sentinel.released) {
      await sentinel.release().catch(() => undefined);
    }
  }
}
