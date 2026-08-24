import { Injectable, effect, signal } from '@angular/core';
import { StorageService } from './storage.service';

const THEME_KEY = 'pomodoro_dark_mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);
  readonly ready: Promise<void>;

  constructor(private storage: StorageService) {
    this.ready = this.restore();
    effect(() => {
      document.body.classList.toggle('dark', this.isDark());
    });
  }

  private async restore(): Promise<void> {
    const stored = await this.storage.get<boolean>(THEME_KEY);
    if (stored !== null) {
      this.isDark.set(stored);
    }
  }

  async setDark(value: boolean): Promise<void> {
    this.isDark.set(value);
    await this.storage.set(THEME_KEY, value);
  }
}
