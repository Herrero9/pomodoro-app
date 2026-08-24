import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TimerService } from '../services/timer.service';
import { ThemeService } from '../services/theme.service';
import { PomodoroSettings } from '../models/pomodoro.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  form: PomodoroSettings;

  constructor(private timer: TimerService, public theme: ThemeService, private router: Router) {
    this.form = { ...this.timer.settings() };
  }

  async ngOnInit(): Promise<void> {
    await this.timer.ready;
    this.form = { ...this.timer.settings() };
  }

  async save(): Promise<void> {
    await this.timer.updateSettings({
      workMinutes: this.clamp(this.form.workMinutes),
      shortBreakMinutes: this.clamp(this.form.shortBreakMinutes),
      longBreakMinutes: this.clamp(this.form.longBreakMinutes),
      sessionsBeforeLongBreak: this.clamp(this.form.sessionsBeforeLongBreak),
    });
    this.router.navigateByUrl('/home');
  }

  toggleDark(): void {
    this.theme.setDark(!this.theme.isDark());
  }

  private clamp(minutes: number): number {
    return Math.max(1, Math.round(minutes || 1));
  }
}
