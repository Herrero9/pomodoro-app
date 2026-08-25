import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';

/**
 * Single-column layout used below the desktop breakpoint: countdown ring,
 * controls and the history list stacked vertically.
 */
@Component({
  selector: 'app-panel-compact',
  templateUrl: './panel-compact.component.html',
  styleUrls: ['./panel-compact.component.scss'],
  standalone: false,
})
export class PanelCompactComponent {
  readonly timer = inject(TimerService);
}
