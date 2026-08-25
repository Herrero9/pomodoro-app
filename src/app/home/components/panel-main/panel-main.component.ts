import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { FOCUS_SESSION_TITLE, SHORTCUTS } from '../../../models/pomodoro.model';

/** Left-hand panel of the desktop layout: ring, countdown and controls. */
@Component({
  selector: 'app-panel-main',
  templateUrl: './panel-main.component.html',
  styleUrls: ['./panel-main.component.scss'],
  standalone: false,
})
export class PanelMainComponent {
  readonly sessionTitle = FOCUS_SESSION_TITLE;
  readonly shortcuts = SHORTCUTS;

  readonly timer = inject(TimerService);
}
