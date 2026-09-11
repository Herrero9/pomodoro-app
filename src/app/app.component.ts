import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { PresenceService } from './services/presence.service';
import { AmbientService } from './services/ambient.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // All three are injected for their side effects, and nothing here reads them
  // back: ThemeService applies the stored theme to <body> before the first page
  // renders, PresenceService starts mirroring the countdown into the browser
  // tab title and holding the screen-wake lock, and AmbientService plays the
  // ambient loop -- on any route, not just while a page that shows it is open.
  private readonly theme = inject(ThemeService);
  private readonly presence = inject(PresenceService);
  private readonly ambient = inject(AmbientService);
}
