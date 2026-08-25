import { Component, computed, input } from '@angular/core';

/**
 * Radius of the progress circle inside the 200x200 viewBox. The rendered size
 * is set in CSS (`--ring-size`), so the geometry here never changes.
 */
const RADIUS = 88;

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
}
