import { Component } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-home-header',
  templateUrl: './home-header.component.html',
  styleUrls: ['./home-header.component.scss'],
  standalone: false,
})
export class HomeHeaderComponent {
  constructor(
    public timer: TimerService,
    public theme: ThemeService
  ) {}

  get currentWorkPeriod(): number {
    const completed = this.timer.workPeriodsCompleted();
    return this.timer.phase() === 'work' ? completed + 1 : completed;
  }
}
