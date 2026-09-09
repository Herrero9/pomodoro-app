import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';

/**
 * "What are you working on?" -- the label filed with every completed work
 * period, which is what turns the history from a list of identical 25-minute
 * rows into something worth reading back.
 *
 * `ionChange` (blur or Enter) rather than `ionInput`, so the value is written
 * to storage once per edit instead of once per keystroke.
 */
@Component({
  selector: 'app-task-input',
  templateUrl: './task-input.component.html',
  styleUrls: ['./task-input.component.scss'],
  standalone: false,
})
export class TaskInputComponent {
  readonly timer = inject(TimerService);

  commit(value: unknown): void {
    void this.timer.setTask(typeof value === 'string' ? value : '');
  }
}
