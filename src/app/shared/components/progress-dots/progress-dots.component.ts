import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';

/**
 * One dot per work period in the current cycle, filled as periods are
 * completed. Extra content (a counter, a caption) can be projected next to it.
 */
@Component({
  selector: 'app-progress-dots',
  templateUrl: './progress-dots.component.html',
  styleUrls: ['./progress-dots.component.scss'],
  standalone: false,
})
export class ProgressDotsComponent {
  readonly timer = inject(TimerService);
}
