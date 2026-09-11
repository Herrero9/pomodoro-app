import { Component, computed, inject } from '@angular/core';
import { AlertController, AlertInput } from '@ionic/angular/lazy';
import { TimerService } from '../../../services/timer.service';
import { MAX_CUSTOM_PRESETS, Preset } from '../../../models/pomodoro.model';

/**
 * One-tap duration presets: the four the app ships with, then whatever the user
 * has added. Shared by both layouts -- the keyboard shortcuts that also apply
 * them only exist on desktop, so on a phone these tiles are the only way in.
 */
@Component({
  selector: 'app-preset-grid',
  templateUrl: './preset-grid.component.html',
  styleUrls: ['./preset-grid.component.scss'],
  standalone: false,
})
export class PresetGridComponent {
  readonly maxCustomPresets = MAX_CUSTOM_PRESETS;

  readonly timer = inject(TimerService);

  /**
   * Name of the preset matching the current durations, or null for a custom
   * setup. Matched on the durations rather than on an id, so a preset stays
   * highlighted when the same pair is reached from Ajustes.
   */
  readonly activePresetName = computed(() => {
    const settings = this.timer.settings();
    const match = this.timer
      .presets()
      .find(
        (p) =>
          p.workMinutes === settings.workMinutes && p.breakMinutes === settings.shortBreakMinutes
      );
    return match?.name ?? null;
  });

  private readonly alerts = inject(AlertController);

  /**
   * Asks for a name and the two durations, then files the preset. The alert's
   * own inputs are enough here: three fields, no live validation to show --
   * `TimerService.addPreset` clamps what comes back the same way the settings
   * form clamps its own numbers.
   */
  async createPreset(): Promise<void> {
    const inputs: AlertInput[] = [
      { name: 'name', type: 'text', placeholder: 'Nombre', attributes: { maxlength: 32 } },
      { name: 'workMinutes', type: 'number', placeholder: 'Trabajo (min)', min: 1 },
      { name: 'breakMinutes', type: 'number', placeholder: 'Descanso (min)', min: 1 },
    ];

    const alert = await this.alerts.create({
      header: 'Nuevo preset',
      message: 'Tus duraciones de trabajo y descanso, a un toque.',
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data: { name: string; workMinutes: string; breakMinutes: string }) => {
            void this.timer.addPreset({
              name: data.name ?? '',
              workMinutes: Number(data.workMinutes),
              breakMinutes: Number(data.breakMinutes),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  /** Deleting a preset cannot be undone, so it goes through a confirmation. */
  async confirmDelete(preset: Preset): Promise<void> {
    if (!preset.id) {
      return;
    }
    const alert = await this.alerts.create({
      header: '¿Borrar el preset?',
      message: `Se quita «${preset.name}» de la lista. Las duraciones actuales no cambian.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => void this.timer.deletePreset(preset.id as string),
        },
      ],
    });
    await alert.present();
  }
}
