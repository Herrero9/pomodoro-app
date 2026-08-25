import { Component, inject, input } from '@angular/core';
import { TimerService } from '../../../services/timer.service';

/**
 * Start/pause, skip and reset buttons. Talks to `TimerService` directly, so any
 * layout can drop it in without wiring outputs back to a parent.
 */
@Component({
  selector: 'app-timer-controls',
  templateUrl: './timer-controls.component.html',
  styleUrls: ['./timer-controls.component.scss'],
  standalone: false,
})
export class TimerControlsComponent {
  /** Show text next to the skip/reset icons. The compact layout has no room for it. */
  readonly showLabels = input(false);

  readonly timer = inject(TimerService);
}
