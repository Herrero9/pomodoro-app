import { Component, HostListener, computed, inject } from '@angular/core';
import { TimerService } from '../services/timer.service';
import { ThemeService } from '../services/theme.service';
import { PRESETS } from '../models/pomodoro.model';

/** Tags whose own key handling must win over the app-wide shortcuts. */
const EDITABLE_TAGS = ['INPUT', 'TEXTAREA'];

/**
 * Shell for the timer screen. It owns no timer state of its own: it picks the
 * layout for the viewport (`panel-compact` or the two desktop panels), swaps in
 * the break overlay, and routes the global keyboard shortcuts to the services.
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  readonly timer = inject(TimerService);

  /**
   * The one line a screen reader is told when something changes. Phase and
   * running state only: the seconds are deliberately left out, since a live
   * region that updates every tick drowns out everything else on the page.
   */
  readonly liveStatus = computed(
    () => `${this.timer.phaseLabel()}. ${this.timer.isRunning() ? 'En marcha' : 'En pausa'}.`
  );

  private readonly theme = inject(ThemeService);

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && EDITABLE_TAGS.includes(target.tagName)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (event.code === 'Space' || key === ' ') {
      event.preventDefault(); // stop the page from scrolling
      this.timer.toggle();
      return;
    }

    switch (key) {
      case 's':
        this.timer.skip();
        break;
      case 'r':
        this.timer.reset();
        break;
      case 't':
        this.theme.setDark(!this.theme.isDark());
        break;
      default: {
        // Digits 1-4 apply the matching preset.
        const preset = PRESETS.find((p) => p.key === key);
        if (preset) {
          this.timer.applyPreset(preset);
        }
      }
    }
  }
}
