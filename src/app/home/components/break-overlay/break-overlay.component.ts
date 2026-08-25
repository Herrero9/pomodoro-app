import { Component, computed, inject, signal } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { REST_IDEAS } from '../../../models/pomodoro.model';

/**
 * Full-window takeover shown while a break is running: it hides the work UI on
 * purpose, so the break is spent away from the timer.
 *
 * `HomePage` only renders it during a break, so the component is created anew
 * every time one starts -- which is what picks the first suggestion.
 */
@Component({
  selector: 'app-break-overlay',
  templateUrl: './break-overlay.component.html',
  styleUrls: ['./break-overlay.component.scss'],
  standalone: false,
})
export class BreakOverlayComponent {
  readonly timer = inject(TimerService);

  private readonly restIndex = signal(Math.floor(Math.random() * REST_IDEAS.length));

  readonly restIdea = computed(() => REST_IDEAS[this.restIndex()]);

  /** Rotates to a different suggestion; never repeats the one on screen. */
  nextRestIdea(): void {
    this.restIndex.update((current) => {
      if (REST_IDEAS.length < 2) {
        return current;
      }
      const offset = 1 + Math.floor(Math.random() * (REST_IDEAS.length - 1));
      return (current + offset) % REST_IDEAS.length;
    });
  }
}
