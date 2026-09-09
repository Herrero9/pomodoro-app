import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';

/**
 * Right-hand sidebar of the desktop layout. It composes shared blocks (sound,
 * presets, cycle progress) rather than owning them, because the compact layout
 * shows the same ones.
 */
@Component({
  selector: 'app-panel-side',
  templateUrl: './panel-side.component.html',
  styleUrls: ['./panel-side.component.scss'],
  standalone: false,
})
export class PanelSideComponent {
  readonly timer = inject(TimerService);
}
