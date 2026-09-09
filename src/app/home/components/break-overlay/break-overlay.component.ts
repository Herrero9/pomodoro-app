import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { REST_IDEAS } from '../../../models/pomodoro.model';

/**
 * Full-window takeover shown while a break is running: it hides the work UI on
 * purpose, so the break is spent away from the timer.
 *
 * `HomePage` only renders it during a break, so the component is created anew
 * every time one starts -- which is what picks the first suggestion.
 *
 * It behaves as a modal dialog: the page underneath is marked `inert` by
 * `HomePage`, and the two actions here are the only things focus can reach.
 */
@Component({
  selector: 'app-break-overlay',
  templateUrl: './break-overlay.component.html',
  styleUrls: ['./break-overlay.component.scss'],
  standalone: false,
})
export class BreakOverlayComponent implements AfterViewInit {
  @HostBinding('attr.role') readonly role = 'dialog';
  @HostBinding('attr.aria-modal') readonly ariaModal = 'true';
  @HostBinding('attr.aria-label') readonly ariaLabel = 'Descanso en curso';

  readonly timer = inject(TimerService);

  private readonly firstAction = viewChild<ElementRef<HTMLElement>>('firstAction');

  private readonly restIndex = signal(Math.floor(Math.random() * REST_IDEAS.length));

  readonly restIdea = computed(() => REST_IDEAS[this.restIndex()]);

  ngAfterViewInit(): void {
    // Without this, focus stays on whatever started the break -- a control that
    // is now behind an inert layer, which leaves keyboard users nowhere.
    this.firstAction()?.nativeElement.focus();
  }

  /**
   * Escape ends the break, matching what every other modal in the platform
   * does with the key.
   */
  @HostListener('document:keydown.escape')
  dismissWithEscape(): void {
    this.timer.skip();
  }

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
