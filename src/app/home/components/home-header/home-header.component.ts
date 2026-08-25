import { Component, inject } from '@angular/core';
import { TimerService } from '../../../services/timer.service';
import { ThemeService } from '../../../services/theme.service';

/** Toolbar shared by both home layouts: cycle counter, theme toggle, settings. */
@Component({
  selector: 'app-home-header',
  templateUrl: './home-header.component.html',
  styleUrls: ['./home-header.component.scss'],
  standalone: false,
})
export class HomeHeaderComponent {
  readonly timer = inject(TimerService);
  readonly theme = inject(ThemeService);
}
