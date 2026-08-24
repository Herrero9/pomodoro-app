import { Component } from '@angular/core';
import { TimerService } from '../services/timer.service';
import { PHASE_LABELS } from '../models/pomodoro.model';

const RADIUS = 88;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  readonly phaseLabels = PHASE_LABELS;
  readonly circumference = 2 * Math.PI * RADIUS;

  constructor(public timer: TimerService) {}

  get dashOffset(): number {
    return this.circumference * (1 - this.timer.progress());
  }

  get currentWorkPeriod(): number {
    const completed = this.timer.workPeriodsCompleted();
    return this.timer.phase() === 'work' ? completed + 1 : completed;
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

  get progressDots(): boolean[] {
    const total = this.timer.settings().sessionsBeforeLongBreak;
    const completed = this.timer.workPeriodsCompleted();
    return Array.from({ length: total }, (_, i) => i < completed);
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

  formatCompletedAt(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
