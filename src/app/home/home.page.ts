import { Component, HostListener, effect, signal } from '@angular/core';
import { TimerService } from '../services/timer.service';
import { ThemeService } from '../services/theme.service';
import { PHASE_LABELS, PRESETS, REST_IDEAS, Preset, RestIdea } from '../models/pomodoro.model';

const RADIUS = 88;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  readonly phaseLabels = PHASE_LABELS;
  readonly presets = PRESETS;
  readonly circumference = 2 * Math.PI * RADIUS;

  private readonly restIndex = signal(0);

  constructor(
    public timer: TimerService,
    public theme: ThemeService
  ) {
    effect(() => {
      if (this.timer.phase() !== 'work') {
        this.pickRestIdea();
      }
    });
  }

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

  get minsLeftLabel(): string {
    const minutes = Math.ceil(this.timer.secondsRemaining() / 60);
    return `${minutes} min`;
  }

  get restIdea(): RestIdea {
    return REST_IDEAS[this.restIndex()];
  }

  get progressDots(): boolean[] {
    const total = this.timer.settings().sessionsBeforeLongBreak;
    const completed = this.timer.workPeriodsCompleted();
    return Array.from({ length: total }, (_, i) => i < completed);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (event.code === 'Space' || key === ' ') {
      event.preventDefault();
      this.toggle();
    } else if (key === 's') {
      this.timer.skip();
    } else if (key === 'r') {
      this.timer.reset();
    } else if (key === 't') {
      this.theme.setDark(!this.theme.isDark());
    } else if (['1', '2', '3', '4'].includes(key)) {
      const preset = this.presets.find((p) => p.key === key);
      if (preset) {
        this.applyPreset(preset);
      }
    }
  }

  toggle(): void {
    if (this.timer.isRunning()) {
      this.timer.pause();
    } else {
      this.timer.start();
    }
  }

  applyPreset(preset: Preset): void {
    this.timer.updateSettings({
      ...this.timer.settings(),
      workMinutes: preset.workMinutes,
      shortBreakMinutes: preset.breakMinutes,
    });
  }

  nextRestIdea(): void {
    this.pickRestIdea();
  }

  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatCompletedAt(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private pickRestIdea(): void {
    let index = Math.floor(Math.random() * REST_IDEAS.length);
    if (REST_IDEAS.length > 1 && index === this.restIndex()) {
      index = (index + 1) % REST_IDEAS.length;
    }
    this.restIndex.set(index);
  }
}
