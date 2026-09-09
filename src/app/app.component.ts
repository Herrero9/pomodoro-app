import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { PresenceService } from './services/presence.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Both are injected for their side effects, and nothing reads them back:
  // ThemeService applies the stored theme to <body> before the first page
  // renders, and PresenceService starts mirroring the countdown into the
  // browser tab title and holding the screen-wake lock.
  private readonly theme = inject(ThemeService);
  private readonly presence = inject(PresenceService);
}
