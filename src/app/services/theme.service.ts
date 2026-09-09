import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

const THEME_KEY = 'pomodoro_dark_mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);

  /** Resolves once the stored preference has been read back. */
  readonly ready: Promise<void>;

  private readonly storage = inject(StorageService);

  constructor() {
    this.ready = this.restore();
    // Single place where the preference reaches the DOM; every stylesheet
    // hangs its dark palette off `body.dark`.
    effect(() => {
      document.body.classList.toggle('dark', this.isDark());
    });
  }

  private async restore(): Promise<void> {
    const stored = await this.storage.get<boolean>(THEME_KEY);
    // No stored preference yet: follow the OS on this first run. The toggle
    // takes over from the moment it is used -- this is a starting point, not a
    // live subscription to the media query.
    this.isDark.set(stored ?? prefersDarkScheme());
  }

  async setDark(value: boolean): Promise<void> {
    this.isDark.set(value);
    await this.storage.set(THEME_KEY, value);
  }
}

/** Whether the OS asks for a dark UI. `false` where the query is unavailable. */
function prefersDarkScheme(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
