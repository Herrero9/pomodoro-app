import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { AmbientService } from '../../../services/ambient.service';

/**
 * Right-hand sidebar of the desktop layout. It composes shared blocks (sound,
 * presets, cycle progress) rather than owning them, because the compact layout
 * shows most of the same ones. The background sound is the exception: only
 * here is there a choice between the YouTube player and the ambient loops.
 */
@Component({
  selector: 'app-panel-side',
  templateUrl: './panel-side.component.html',
  styleUrls: ['./panel-side.component.scss'],
  standalone: false,
})
export class PanelSideComponent {
  readonly timer = inject(TimerService);
  readonly ambient = inject(AmbientService);
}
