import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TimerService } from '../services/timer.service';
import { ThemeService } from '../services/theme.service';
import { AlertService } from '../services/alert.service';
import { DEFAULT_SETTINGS, extractYouTubeId, PomodoroSettings } from '../models/pomodoro.model';

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

  /**
   * Set when the user asks for notifications and the browser refuses. The
   * toggle goes back off, and this explains why -- silently ignoring the tap
   * would look like a bug.
   */
  readonly notificationsBlocked = signal(false);

  readonly theme = inject(ThemeService);
  private readonly timer = inject(TimerService);
  private readonly alerts = inject(AlertService);
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
      ...this.form,
      workMinutes: this.toPositiveInt(this.form.workMinutes),
      shortBreakMinutes: this.toPositiveInt(this.form.shortBreakMinutes),
      longBreakMinutes: this.toPositiveInt(this.form.longBreakMinutes),
      sessionsBeforeLongBreak: this.toPositiveInt(this.form.sessionsBeforeLongBreak),
      soundVideoId,
    });
    this.router.navigateByUrl('/home');
  }

  /** Puts every field back to the shipped defaults, still pending an explicit save. */
  restoreDefaults(): void {
    this.form = { ...DEFAULT_SETTINGS };
    this.notificationsBlocked.set(false);
  }

  /**
   * Notifications need the browser's permission, and the request has to come
   * from a user gesture -- which is exactly this toggle. Turning them *off*
   * never asks for anything.
   */
  async setNotifications(enabled: boolean): Promise<void> {
    if (!enabled) {
      this.form.alertNotification = false;
      this.notificationsBlocked.set(false);
      return;
    }
    const granted = await this.alerts.requestNotificationPermission();
    this.form.alertNotification = granted;
    this.notificationsBlocked.set(!granted);
  }

  toggleDark(): void {
    this.theme.setDark(!this.theme.isDark());
  }

  /** Guards against empty, fractional or zero/negative values typed into the form. */
  private toPositiveInt(value: number): number {
    return Math.max(1, Math.round(value || 1));
  }
}
