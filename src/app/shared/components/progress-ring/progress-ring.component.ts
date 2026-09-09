import { Component, computed, effect, input, signal, untracked } from '@angular/core';

/**
 * Radius of the progress circle inside the 200x200 viewBox. The rendered size
 * is set in CSS (`--ring-size`), so the geometry here never changes.
 */
const RADIUS = 88;

/**
 * Biggest progress change a single tick can produce, plus a margin. Anything
 * larger is a jump (a reset, a skip, a phase change) rather than the clock
 * moving on: a one-second period would be the only false positive.
 */
const TICK_DELTA_CEILING = 0.05;

/**
 * Circular countdown indicator. Purely presentational: it takes a 0-to-1
 * progress value and projects whatever should sit in the middle (the countdown,
 * a percentage...) through `<ng-content>`.
 */
@Component({
  selector: 'app-progress-ring',
  templateUrl: './progress-ring.component.html',
  styleUrls: ['./progress-ring.component.scss'],
  standalone: false,
})
export class ProgressRingComponent {
  /** Fraction of the ring to fill, 0 to 1. */
  readonly progress = input(0);

  /** `compact` for the mobile layout, `panel` for the smaller desktop ring. */
  readonly variant = input<'compact' | 'panel'>('compact');

  readonly radius = RADIUS;
  readonly circumference = 2 * Math.PI * RADIUS;

  /** Length of the un-filled arc; SVG draws the dash from the start of the circle. */
  readonly dashOffset = computed(() => this.circumference * (1 - this.progress()));

  /**
   * Whether this change should animate. The 1s transition is there to make a
   * tick look continuous; on a reset or a phase change it turned an instant
   * action into a slow sweep, so those are drawn immediately instead.
   */
  readonly animated = signal(true);

  private previousProgress = 0;

  constructor() {
    effect(() => {
      const next = this.progress();
      const isJump = Math.abs(next - this.previousProgress) > TICK_DELTA_CEILING;
      this.previousProgress = next;
      untracked(() => this.animated.set(!isJump));
    });
  }
}
