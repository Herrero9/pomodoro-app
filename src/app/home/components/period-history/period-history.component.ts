import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { PHASE_LABELS } from '../../../models/pomodoro.model';

/** Reverse-chronological list of the periods completed so far. */
@Component({
  selector: 'app-period-history',
  templateUrl: './period-history.component.html',
  styleUrls: ['./period-history.component.scss'],
  standalone: false,
})
export class PeriodHistoryComponent {
  readonly phaseLabels = PHASE_LABELS;

  readonly timer = inject(TimerService);
}
