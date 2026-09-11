import { Component, inject } from '@angular/core';
import { AmbientService } from '../../../services/ambient.service';
import { AMBIENT_SOUNDS } from '../../../models/pomodoro.model';

/**
 * The ambient-sound picker: one tile per sound, a volume slider and a line
 * saying when the sound plays. Shared because both layouts show it -- it is
 * the only background sound the phone has.
 */
@Component({
  selector: 'app-ambient-player',
  templateUrl: './ambient-player.component.html',
  styleUrls: ['./ambient-player.component.scss'],
  standalone: false,
})
export class AmbientPlayerComponent {
  readonly ambient = inject(AmbientService);
  readonly sounds = AMBIENT_SOUNDS;
}
