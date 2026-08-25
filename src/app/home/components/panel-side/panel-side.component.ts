import { Component, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TimerService } from '../../../services/timer.service';
import {
  DEFAULT_SOUND_VIDEO_ID,
  PHASE_LABELS,
  PRESETS,
  Preset,
  extractYouTubeId,
} from '../../../models/pomodoro.model';

@Component({
  selector: 'app-panel-side',
  templateUrl: './panel-side.component.html',
  styleUrls: ['./panel-side.component.scss'],
  standalone: false,
})
export class PanelSideComponent {
  readonly phaseLabels = PHASE_LABELS;
  readonly presets = PRESETS;

  readonly soundUrl = computed<SafeResourceUrl>(() => {
    const id = extractYouTubeId(this.timer.settings().soundVideoId) ?? DEFAULT_SOUND_VIDEO_ID;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`
    );
  });

  readonly activePresetName = computed(() => {
    const settings = this.timer.settings();
    const match = this.presets.find(
      (p) => p.workMinutes === settings.workMinutes && p.breakMinutes === settings.shortBreakMinutes
    );
    return match?.name ?? null;
  });

  constructor(
    public timer: TimerService,
    private sanitizer: DomSanitizer
  ) {}

  get currentWorkPeriod(): number {
    const completed = this.timer.workPeriodsCompleted();
    return this.timer.phase() === 'work' ? completed + 1 : completed;
  }

  get nextLabel(): string {
    if (this.timer.phase() !== 'work') {
      return this.phaseLabels['work'];
    }
    const upcoming = this.timer.workPeriodsCompleted() + 1;
    return upcoming >= this.timer.settings().sessionsBeforeLongBreak
      ? this.phaseLabels['longBreak']
      : this.phaseLabels['shortBreak'];
  }

  get progressDots(): boolean[] {
    const total = this.timer.settings().sessionsBeforeLongBreak;
    const completed = this.timer.workPeriodsCompleted();
    return Array.from({ length: total }, (_, i) => i < completed);
  }

  applyPreset(preset: Preset): void {
    this.timer.updateSettings({
      ...this.timer.settings(),
      workMinutes: preset.workMinutes,
      shortBreakMinutes: preset.breakMinutes,
    });
  }
}
