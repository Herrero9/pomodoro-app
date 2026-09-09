import { Component, computed, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { PRESETS } from '../../../models/pomodoro.model';

/**
 * One-tap duration presets. Shared by both layouts -- the keyboard shortcuts
 * that also apply them only exist on desktop, so on a phone these tiles are the
 * only way in.
 */
@Component({
  selector: 'app-preset-grid',
  templateUrl: './preset-grid.component.html',
  styleUrls: ['./preset-grid.component.scss'],
  standalone: false,
})
export class PresetGridComponent {
  readonly presets = PRESETS;

  readonly timer = inject(TimerService);

  /** Name of the preset matching the current durations, or null for a custom setup. */
  readonly activePresetName = computed(() => {
    const settings = this.timer.settings();
    const match = this.presets.find(
      (p) => p.workMinutes === settings.workMinutes && p.breakMinutes === settings.shortBreakMinutes
    );
    return match?.name ?? null;
  });
}
