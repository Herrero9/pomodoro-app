import { Component } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { PHASE_LABELS } from '../../../models/pomodoro.model';

const RADIUS = 88;

@Component({
  selector: 'app-panel-main',
  templateUrl: './panel-main.component.html',
  styleUrls: ['./panel-main.component.scss'],
  standalone: false,
})
export class PanelMainComponent {
  readonly phaseLabels = PHASE_LABELS;
  readonly circumference = 2 * Math.PI * RADIUS;

  readonly shortcuts = [
    { key: 'ESPACIO', label: 'Iniciar / pausar' },
    { key: 'S', label: 'Saltar' },
    { key: 'R', label: 'Reiniciar' },
    { key: 'T', label: 'Tema' },
    { key: '1–4', label: 'Preset' },
  ];

  constructor(public timer: TimerService) {}

  get dashOffset(): number {
    return this.circumference * (1 - this.timer.progress());
  }

  get headline(): string {
    if (this.timer.phase() !== 'work') {
      return 'Respira. Ahora toca descansar.';
    }
    if (this.timer.isRunning()) {
      return 'Estás en ello. Sigue así.';
    }
    if (this.timer.progress() > 0) {
      return 'En pausa. Retómalo cuando quieras.';
    }
    return 'Listo cuando quieras.';
  }

  toggle(): void {
    if (this.timer.isRunning()) {
      this.timer.pause();
    } else {
      this.timer.start();
    }
  }

  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
