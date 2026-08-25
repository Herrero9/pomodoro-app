import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TimerService } from '../services/timer.service';
import { ThemeService } from '../services/theme.service';
import { extractYouTubeId, PomodoroSettings } from '../models/pomodoro.model';

/**
 * Settings form. It edits a local copy of the settings and only commits it on
 * save, so a half-typed duration never reaches the running timer.
 */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  form: PomodoroSettings;

  readonly theme = inject(ThemeService);
  private readonly timer = inject(TimerService);
  private readonly router = inject(Router);

  constructor() {
    this.form = { ...this.timer.settings() };
  }

  async ngOnInit(): Promise<void> {
    // The service restores from storage asynchronously; without this the form
    // would show the defaults on a cold start.
    await this.timer.ready;
    this.form = { ...this.timer.settings() };
  }

  async save(): Promise<void> {
    // An unrecognised video reference keeps the previously saved one rather
    // than silently blanking the background sound.
    const soundVideoId =
      extractYouTubeId(this.form.soundVideoId) ?? this.timer.settings().soundVideoId;

    await this.timer.updateSettings({
      workMinutes: this.toPositiveInt(this.form.workMinutes),
      shortBreakMinutes: this.toPositiveInt(this.form.shortBreakMinutes),
      longBreakMinutes: this.toPositiveInt(this.form.longBreakMinutes),
      sessionsBeforeLongBreak: this.toPositiveInt(this.form.sessionsBeforeLongBreak),
      soundVideoId,
    });
    this.router.navigateByUrl('/home');
  }

  toggleDark(): void {
    this.theme.setDark(!this.theme.isDark());
  }

  /** Guards against empty, fractional or zero/negative values typed into the form. */
  private toPositiveInt(value: number): number {
    return Math.max(1, Math.round(value || 1));
  }
}
