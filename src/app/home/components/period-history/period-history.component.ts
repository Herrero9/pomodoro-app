import { Component, inject } from '@angular/core';
import { AlertButton } from '@ionic/angular';
import { TimerService } from '../../../services/timer.service';
import { PHASE_LABELS } from '../../../models/pomodoro.model';

/**
 * Reverse-chronological list of the periods completed so far, with the day's
 * totals on top. Shown in the history modal, which both layouts open from the
 * toolbar.
 */
@Component({
  selector: 'app-period-history',
  templateUrl: './period-history.component.html',
  styleUrls: ['./period-history.component.scss'],
  standalone: false,
})
export class PeriodHistoryComponent {
  readonly phaseLabels = PHASE_LABELS;

  readonly timer = inject(TimerService);

  /** Emptying the history cannot be undone, so it goes through a confirmation. */
  readonly clearButtons: AlertButton[] = [
    { text: 'Cancelar', role: 'cancel' },
    { text: 'Vaciar', role: 'destructive', handler: () => void this.timer.clearHistory() },
  ];
}
